import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { AiNotesGuidePanel } from './AiNotesGuidePanel'
import { DocsModal } from './DocsModal'
import { FileExplorer, type FileExplorerHandle } from './FileExplorer'
import { FileModal } from './FileModal'
import { GraphView, type GraphViewHandle } from './GraphView'
import { ReviewGuidePanel } from './ReviewGuidePanel'
import { TagFilter } from './TagFilter'
import {
  buildDeepLink,
  parseDeepLink,
  replaceDeepLinkUrl,
  type ThemeMode,
} from './urlState'
import type {
  ChangeHunk,
  ChangeSet,
  ChangeSetSummary,
  FilePayload,
  GraphData,
  NoteSet,
  NoteSummary,
  TagMatchMode,
  ViewMode,
} from './types'

const THEME_KEY = 'tag-tree-theme'
const LAYOUT_KEY = 'tag-tree-layout'
const SPLIT_MIN = 0.2
const SPLIT_MAX = 0.8
const FILE_HISTORY_MAX = 50

type FileHistoryEntry = {
  path: string
  line: number | null
}

type LayoutChrome = {
  splitView: boolean
  fileZoomed: boolean
  explorerOpen: boolean
  splitRatio: number
}

const DEFAULT_LAYOUT: LayoutChrome = {
  splitView: false,
  fileZoomed: false,
  explorerOpen: false,
  splitRatio: 0.5,
}

function readStoredTheme(): ThemeMode {
  try {
    const raw = localStorage.getItem(THEME_KEY)
    if (raw === 'dark' || raw === 'light') return raw
  } catch {
    /* ignore */
  }
  return 'light'
}

function clampSplitRatio(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_LAYOUT.splitRatio
  return Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, value))
}

function readStoredLayout(): LayoutChrome {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY)
    if (!raw) return { ...DEFAULT_LAYOUT }
    const parsed = JSON.parse(raw) as Partial<LayoutChrome>
    const splitView = parsed.splitView === true
    const fileZoomed = splitView && parsed.fileZoomed === true
    const explorerOpen = parsed.explorerOpen === true
    const splitRatio = clampSplitRatio(
      typeof parsed.splitRatio === 'number'
        ? parsed.splitRatio
        : DEFAULT_LAYOUT.splitRatio,
    )
    return { splitView, fileZoomed, explorerOpen, splitRatio }
  } catch {
    return { ...DEFAULT_LAYOUT }
  }
}

function writeStoredLayout(layout: LayoutChrome): void {
  try {
    const payload: LayoutChrome = {
      splitView: layout.splitView,
      fileZoomed: layout.splitView && layout.fileZoomed,
      explorerOpen: layout.explorerOpen,
      splitRatio: clampSplitRatio(layout.splitRatio),
    }
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

async function loadGraph(): Promise<GraphData> {
  const res = await fetch(`/graph.json?t=${Date.now()}`)
  if (!res.ok) {
    throw new Error(
      `Failed to load /graph.json (${res.status}). Run: npm start -- --root <path>`,
    )
  }
  return res.json() as Promise<GraphData>
}

async function loadChangeSummaries(): Promise<ChangeSetSummary[]> {
  const res = await fetch(`/api/changes?t=${Date.now()}`)
  if (!res.ok) return []
  return res.json() as Promise<ChangeSetSummary[]>
}

async function loadChangeSet(id: string): Promise<ChangeSet> {
  const res = await fetch(`/api/changes/${encodeURIComponent(id)}?t=${Date.now()}`)
  const body = (await res.json()) as ChangeSet & { error?: string }
  if (!res.ok) {
    throw new Error(body.error || `Failed to load change set (${res.status})`)
  }
  return body
}

async function loadNoteSummaries(): Promise<NoteSummary[]> {
  const res = await fetch(`/api/notes?t=${Date.now()}`)
  if (!res.ok) return []
  return res.json() as Promise<NoteSummary[]>
}

async function loadNoteSet(id: string): Promise<NoteSet> {
  const res = await fetch(`/api/notes/${encodeURIComponent(id)}?t=${Date.now()}`)
  const body = (await res.json()) as NoteSet & { error?: string }
  if (!res.ok) {
    throw new Error(body.error || `Failed to load note (${res.status})`)
  }
  return body
}

function noteNodesToHunks(note: NoteSet | null): ChangeHunk[] {
  if (!note?.nodes.length) return []
  return note.nodes.map((n) => ({
    path: n.path,
    comment: n.comment,
    notes: n.notes,
    // No Diff / line hatch for notes — keep from/to invalid for highlight ranges.
    from: 0,
    to: 0,
    rows: [],
  }))
}

/**
 * Loads generated graph.json and renders tag filter + React Flow graph.
 */
export default function App() {
  const [boot] = useState(() => {
    const link = parseDeepLink(window.location.search, clampSplitRatio)
    const layout = readStoredLayout()
    return { link, layout }
  })
  const [graph, setGraph] = useState<GraphData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>(
    () => boot.link.tags ?? [],
  )
  const [menuOpen, setMenuOpen] = useState(() => boot.link.menu ?? true)
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => boot.link.mode ?? 'highlight',
  )
  const [tagMatchMode, setTagMatchMode] = useState<TagMatchMode>(
    () => boot.link.match ?? 'any',
  )
  const [theme, setTheme] = useState<ThemeMode>(
    () => boot.link.theme ?? readStoredTheme(),
  )
  const [docsOpen, setDocsOpen] = useState(false)
  const [pathGlow, setPathGlow] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [reloadError, setReloadError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const splitPreferred =
    boot.link.split !== undefined ? boot.link.split : boot.layout.splitView
  const [splitView, setSplitView] = useState(splitPreferred)
  const [splitRatio, setSplitRatio] = useState(
    () => boot.link.ratio ?? boot.layout.splitRatio,
  )
  const [fileZoomed, setFileZoomed] = useState(() => {
    if (!splitPreferred) return false
    if (boot.link.zoom !== undefined) return boot.link.zoom
    return boot.layout.fileZoomed
  })
  const [fileLoading, setFileLoading] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [file, setFile] = useState<FilePayload | null>(null)
  const [jumpToLine, setJumpToLine] = useState<number | null>(null)
  const [changeSummaries, setChangeSummaries] = useState<ChangeSetSummary[]>(
    [],
  )
  const [selectedChangeId, setSelectedChangeId] = useState<string>(() =>
    boot.link.change !== undefined ? boot.link.change : '',
  )
  const [changeSet, setChangeSet] = useState<ChangeSet | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [noteSummaries, setNoteSummaries] = useState<NoteSummary[]>([])
  const [selectedNoteId, setSelectedNoteId] = useState('')
  const [noteSet, setNoteSet] = useState<NoteSet | null>(null)
  const [notesGuideOpen, setNotesGuideOpen] = useState(false)
  const [explorerOpen, setExplorerOpen] = useState(
    () =>
      boot.link.explorer !== undefined
        ? boot.link.explorer
        : boot.layout.explorerOpen,
  )
  const [visibleNodeIds, setVisibleNodeIds] = useState<string[]>([])
  const workspaceRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<GraphViewHandle>(null)
  const explorerRef = useRef<FileExplorerHandle>(null)
  const explorerOpenRef = useRef(explorerOpen)
  explorerOpenRef.current = explorerOpen
  const openedFromExplorerRef = useRef(false)
  const lastViewedPathRef = useRef<string | null>(null)
  const lastLocatedPathRef = useRef<string | null>(null)
  const locateFromExplorerRef = useRef(false)
  const hopActiveRef = useRef(false)
  const canvasAnchorRef = useRef<string | null>(null)
  const fileViewerOpenRef = useRef(false)
  const splitViewRef = useRef(splitView)
  splitViewRef.current = splitView
  const fileHistoryRef = useRef<FileHistoryEntry[]>([])
  const fileHistoryIndexRef = useRef(-1)
  const historyNavigatingRef = useRef(false)
  const navigateFileHistoryRef = useRef<(delta: -1 | 1) => void>(() => {})
  const pendingFileRef = useRef<string | undefined>(boot.link.file)
  const pendingLineRef = useRef<number | null>(boot.link.line ?? null)
  const pendingFocusRef = useRef<string | undefined>(boot.link.focus)
  const pendingReviewRef = useRef(boot.link.review === true)
  const urlHydratingRef = useRef(true)
  const urlLineRef = useRef<number | null>(boot.link.line ?? null)
  const [focusPath, setFocusPath] = useState<string | null>(
    () => boot.link.focus ?? null,
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  useEffect(() => {
    writeStoredLayout({
      splitView,
      fileZoomed,
      explorerOpen,
      splitRatio,
    })
  }, [splitView, fileZoomed, explorerOpen, splitRatio])

  useEffect(() => {
    fileViewerOpenRef.current =
      Boolean(file || fileLoading || fileError) && (splitView || modalOpen)
  }, [splitView, modalOpen, file, fileLoading, fileError])

  useEffect(() => {
    function shouldIgnoreAppHotkey(target: HTMLElement | null): boolean {
      if (!target) return false
      if (
        target.closest(
          '.monaco-editor, .modal-backdrop, textarea, [contenteditable="true"]',
        )
      ) {
        return true
      }
      const tag = target.tagName
      if (tag === 'TEXTAREA' || tag === 'SELECT') return true
      if (tag === 'INPUT' && !target.closest('.explorer-panel, .node-search')) {
        return true
      }
      return false
    }

    function focusExplorerPane() {
      setExplorerOpen(true)
      const path = canvasAnchorRef.current || lastLocatedPathRef.current
      window.setTimeout(() => {
        if (path) explorerRef.current?.revealPath(path)
        else explorerRef.current?.focusTree()
      }, 0)
    }

    function focusCanvasPane() {
      graphRef.current?.focusCanvas()
    }

    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null

      if (event.key === 'Escape') {
        if (hopActiveRef.current) return
        if (fileViewerOpenRef.current) return
        if (target?.closest('.monaco-editor, .modal-backdrop, .node-search')) {
          return
        }
        if (
          locateFromExplorerRef.current &&
          explorerOpenRef.current
        ) {
          event.preventDefault()
          locateFromExplorerRef.current = false
          const path = lastLocatedPathRef.current
          window.setTimeout(() => {
            if (path) explorerRef.current?.revealPath(path)
            else explorerRef.current?.focusTree()
          }, 0)
        }
        return
      }

      const mod = event.ctrlKey || event.metaKey

      // Shift+H / Shift+L — file viewer open history (allow from Monaco).
      if (
        fileViewerOpenRef.current &&
        event.shiftKey &&
        !mod &&
        !event.altKey &&
        (event.code === 'KeyH' || event.code === 'KeyL')
      ) {
        const tag = target?.tagName
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          target?.isContentEditable
        ) {
          return
        }
        event.preventDefault()
        event.stopPropagation()
        navigateFileHistoryRef.current(event.code === 'KeyH' ? -1 : 1)
        return
      }

      if (mod && !event.altKey && !shouldIgnoreAppHotkey(target)) {
        const code = event.code
        // Ctrl+← / Ctrl+→ — reliable pane switch (capture + preventDefault).
        // Ctrl+Shift+H / Ctrl+Shift+L — letter chords that browsers do not steal
        // on Latin layouts (plain Ctrl+H/L = History / address bar).
        // Plain Ctrl+H/L still handled when the event reaches the page (e.g. RU layout).
        if (code === 'ArrowLeft' || code === 'ArrowRight') {
          event.preventDefault()
          event.stopPropagation()
          if (code === 'ArrowRight') focusExplorerPane()
          else focusCanvasPane()
          return
        }
        if (code === 'KeyH' || code === 'KeyL') {
          event.preventDefault()
          event.stopPropagation()
          if (code === 'KeyL') focusExplorerPane()
          else focusCanvasPane()
          return
        }
      }

      if (!mod || !event.shiftKey) return
      if (event.code !== 'KeyE') return
      if (shouldIgnoreAppHotkey(target)) return
      event.preventDefault()
      setExplorerOpen((open) => !open)
    }
    // Capture so pane chords win before browser defaults / child handlers.
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  const refreshChanges = useCallback(async () => {
    const list = await loadChangeSummaries()
    setChangeSummaries(list)
    setSelectedChangeId((current) => {
      if (current && list.some((item) => item.id === current)) return current
      return ''
    })
  }, [])

  const refreshNotes = useCallback(async () => {
    const list = await loadNoteSummaries()
    setNoteSummaries(list)
    setSelectedNoteId((current) => {
      if (current && list.some((item) => item.id === current)) return current
      return ''
    })
  }, [])

  const selectChangeId = useCallback((id: string) => {
    setSelectedChangeId(id)
    if (id) {
      setSelectedNoteId('')
      setNoteSet(null)
      setNotesGuideOpen(false)
    }
  }, [])

  const selectNoteId = useCallback((id: string) => {
    setSelectedNoteId(id)
    if (id) {
      setSelectedChangeId('')
      setChangeSet(null)
      setReviewOpen(false)
    }
    if (!id) {
      setNoteSet(null)
      setNotesGuideOpen(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    loadGraph()
      .then((data) => {
        if (!cancelled) {
          setGraph(data)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
        }
      })
    void refreshChanges()
    void refreshNotes()
    return () => {
      cancelled = true
    }
  }, [refreshChanges, refreshNotes])

  useEffect(() => {
    if (!selectedChangeId) {
      setChangeSet(null)
      setReviewOpen(false)
      return
    }
    let cancelled = false
    loadChangeSet(selectedChangeId)
      .then((data) => {
        if (!cancelled) {
          setChangeSet(data)
          setReviewOpen(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setChangeSet(null)
          setReviewOpen(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [selectedChangeId])

  useEffect(() => {
    if (!selectedNoteId) {
      setNoteSet(null)
      setNotesGuideOpen(false)
      return
    }
    let cancelled = false
    loadNoteSet(selectedNoteId)
      .then((data) => {
        if (!cancelled) {
          setNoteSet(data)
          setNotesGuideOpen(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNoteSet(null)
          setNotesGuideOpen(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [selectedNoteId])

  const reviewGuide = changeSet?.review
  const reviewEnabled = Boolean(
    reviewGuide?.goal && reviewGuide.order.length > 0,
  )
  const notesGuide = noteSet?.guide
  const notesGuideEnabled = Boolean(
    notesGuide?.goal && notesGuide.order.length > 0,
  )

  useEffect(() => {
    if (!reviewEnabled) setReviewOpen(false)
  }, [reviewEnabled])

  useEffect(() => {
    if (!notesGuideEnabled) setNotesGuideOpen(false)
  }, [notesGuideEnabled])

  useEffect(() => {
    function shouldIgnoreGuideHotkey(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false
      if (
        target.closest(
          '.monaco-editor, .modal-backdrop, textarea, [contenteditable="true"]',
        )
      ) {
        return true
      }
      const tag = target.tagName
      if (tag === 'TEXTAREA' || tag === 'SELECT') return true
      if (tag === 'INPUT') return true
      return false
    }

    function onGuideKey(event: KeyboardEvent) {
      if (!event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) {
        return
      }
      if (shouldIgnoreGuideHotkey(event.target)) return
      if (event.code === 'KeyR') {
        if (!reviewEnabled) return
        event.preventDefault()
        setReviewOpen((open) => !open)
        return
      }
      if (event.code === 'KeyN') {
        if (!notesGuideEnabled) return
        event.preventDefault()
        setNotesGuideOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onGuideKey)
    return () => window.removeEventListener('keydown', onGuideKey)
  }, [reviewEnabled, notesGuideEnabled])

  const changePaths = useMemo(() => {
    if (!changeSet?.nodes.length) return new Set<string>()
    return new Set(changeSet.nodes.map((n) => n.path))
  }, [changeSet])

  const notePaths = useMemo(() => {
    if (!noteSet) return new Set<string>()
    const paths = new Set<string>()
    for (const path of noteSet.guide.order) {
      if (path) paths.add(path)
    }
    for (const node of noteSet.nodes) {
      if (node.path) paths.add(node.path)
    }
    return paths
  }, [noteSet])

  const modalTags = useMemo(() => {
    if (!file || !graph) return []
    return graph.nodes.find((n) => n.id === file.path)?.tags ?? []
  }, [file, graph])

  const modalTagColors = useMemo(() => {
    if (!graph) return {}
    const colors: Record<string, string> = {}
    for (const entry of graph.configTags) {
      if (typeof entry.color === 'string' && entry.color.trim()) {
        colors[entry.tag] = entry.color.trim()
      }
    }
    return colors
  }, [graph])

  const closeFile = useCallback(() => {
    const pathToReveal = lastViewedPathRef.current
    const restoreExplorer = explorerOpenRef.current
    openedFromExplorerRef.current = false
    fileHistoryRef.current = []
    fileHistoryIndexRef.current = -1
    setModalOpen(false)
    // Keep split / zoom / explorer chrome; only clear the open file session.
    setFileError(null)
    setFile(null)
    setJumpToLine(null)
    if (restoreExplorer) {
      window.setTimeout(() => {
        if (pathToReveal) {
          explorerRef.current?.revealPath(pathToReveal)
        } else {
          explorerRef.current?.focusTree()
        }
      }, 0)
    }
  }, [])

  const handleSplitChange = useCallback((next: boolean) => {
    if (next) {
      setSplitView(true)
      setModalOpen(false)
      setFileZoomed(false)
      return
    }
    // Leave split → modal with the same file (Close clears the viewer).
    setSplitView(false)
    setFileZoomed(false)
    setModalOpen(true)
  }, [])

  const openRequestRef = useRef(0)

  const pushFileHistory = useCallback((path: string, line: number | null) => {
    if (historyNavigatingRef.current) return
    const hist = fileHistoryRef.current
    const idx = fileHistoryIndexRef.current
    const current = idx >= 0 ? hist[idx] : null
    if (current && current.path === path && current.line === line) return
    const next = hist.slice(0, idx + 1)
    next.push({ path, line })
    while (next.length > FILE_HISTORY_MAX) next.shift()
    fileHistoryRef.current = next
    fileHistoryIndexRef.current = next.length - 1
  }, [])

  const openNode = useCallback(
    async (
      nodeId: string,
      fromExplorer = false,
      line: number | null = null,
    ) => {
      openedFromExplorerRef.current = fromExplorer
      lastViewedPathRef.current = nodeId
      const requestId = ++openRequestRef.current
      if (!splitViewRef.current) setModalOpen(true)
      setFileLoading(true)
      setFileError(null)
      setJumpToLine(line)
      try {
        const res = await fetch(`/api/file?path=${encodeURIComponent(nodeId)}`)
        const body = (await res.json()) as FilePayload & { error?: string }
        if (requestId !== openRequestRef.current) return
        if (!res.ok) {
          throw new Error(body.error || `Failed to load file (${res.status})`)
        }
        setFile(body)
        lastViewedPathRef.current = body.path
        pushFileHistory(body.path, line)
      } catch (err: unknown) {
        if (requestId !== openRequestRef.current) return
        setFileError(err instanceof Error ? err.message : String(err))
        setFile(null)
        setJumpToLine(null)
      } finally {
        if (requestId === openRequestRef.current) {
          setFileLoading(false)
        }
      }
    },
    [pushFileHistory],
  )

  const navigateFileHistory = useCallback(
    (delta: -1 | 1) => {
      const hist = fileHistoryRef.current
      const nextIdx = fileHistoryIndexRef.current + delta
      if (nextIdx < 0 || nextIdx >= hist.length) return
      const entry = hist[nextIdx]
      if (!entry) return
      fileHistoryIndexRef.current = nextIdx
      historyNavigatingRef.current = true
      graphRef.current?.locateNode(entry.path, { focus: false })
      void openNode(entry.path, openedFromExplorerRef.current, entry.line).finally(
        () => {
          historyNavigatingRef.current = false
        },
      )
      if (explorerOpenRef.current) {
        window.setTimeout(() => {
          explorerRef.current?.revealPath(entry.path, { focus: false })
        }, 0)
      }
    },
    [openNode],
  )
  navigateFileHistoryRef.current = navigateFileHistory

  useEffect(() => {
    if (!graph) return
    let pendingOpen: Promise<void> | null = null

    const focusId = pendingFocusRef.current
    pendingFocusRef.current = undefined
    if (focusId) {
      const found = graph.nodes.some((n) => n.id === focusId)
      if (found) {
        lastLocatedPathRef.current = focusId
        setFocusPath(focusId)
        window.setTimeout(() => {
          graphRef.current?.locateNode(focusId)
        }, 0)
      }
    }

    const filePath = pendingFileRef.current
    pendingFileRef.current = undefined
    if (filePath) {
      const line = pendingLineRef.current
      pendingLineRef.current = null
      urlLineRef.current = line
      // Always attempt open — unknown paths surface the normal file error UI.
      pendingOpen = openNode(filePath, false, line)
    }

    const finishHydrate = () => {
      urlHydratingRef.current = false
    }
    if (pendingOpen) {
      void pendingOpen.finally(finishHydrate)
    } else {
      finishHydrate()
    }
  }, [graph, openNode])

  useEffect(() => {
    if (!graph || !pendingReviewRef.current) return
    if (!selectedChangeId || !changeSet) return
    if (!reviewEnabled) {
      pendingReviewRef.current = false
      return
    }
    pendingReviewRef.current = false
    setReviewOpen(true)
  }, [graph, selectedChangeId, changeSet, reviewEnabled])

  useEffect(() => {
    urlLineRef.current = jumpToLine
  }, [jumpToLine])

  useEffect(() => {
    if (urlHydratingRef.current) return
    const search = buildDeepLink({
      tags: selectedTags,
      match: tagMatchMode,
      mode: viewMode,
      theme,
      menu: menuOpen,
      change: selectedChangeId,
      review: Boolean(reviewEnabled && reviewOpen),
      file: file?.path ?? null,
      line: file ? urlLineRef.current : null,
      focus: focusPath,
      explorer: explorerOpen,
      split: splitView,
      zoom: fileZoomed,
      ratio: splitRatio,
    })
    replaceDeepLinkUrl(search)
  }, [
    selectedTags,
    tagMatchMode,
    viewMode,
    theme,
    menuOpen,
    selectedChangeId,
    reviewEnabled,
    reviewOpen,
    file?.path,
    jumpToLine,
    focusPath,
    explorerOpen,
    splitView,
    fileZoomed,
    splitRatio,
  ])

  const openReviewPath = useCallback(
    (path: string) => {
      const found = graphRef.current?.locateNode(path)
      if (!found) return
      splitViewRef.current = true
      setSplitView(true)
      setModalOpen(false)
      setFileZoomed(false)
      void openNode(path)
    },
    [openNode],
  )

  const openNodeFromExplorer = useCallback(
    (nodeId: string) => {
      void openNode(nodeId, true)
      // Keep selection on the opened file in the tree.
      window.setTimeout(() => {
        explorerRef.current?.revealPath(nodeId)
      }, 0)
    },
    [openNode],
  )

  const openDefinition = useCallback(
    async (nodeId: string, line: number) => {
      setExplorerOpen(true)
      explorerOpenRef.current = true
      await openNode(nodeId, true, line)
      graphRef.current?.locateNode(nodeId, { focus: false })
      window.setTimeout(() => {
        explorerRef.current?.revealPath(nodeId, { focus: false })
      }, 0)
    },
    [openNode],
  )

  const importTargets = useMemo(() => {
    if (!file || !graph) return []
    return graph.edges
      .filter((e) => e.source === file.path)
      .map((e) => e.target)
  }, [file, graph])

  const onResizerPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      const workspace = workspaceRef.current
      if (!workspace) return

      const onMove = (ev: PointerEvent) => {
        const rect = workspace.getBoundingClientRect()
        if (rect.width <= 0) return
        const next = (ev.clientX - rect.left) / rect.width
        setSplitRatio(Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, next)))
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [],
  )

  const reloadGraph = useCallback(async () => {
    setReloading(true)
    setReloadError(null)
    try {
      const res = await fetch('/api/reload', { method: 'POST' })
      const body = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok) {
        throw new Error(body.error || `Reload failed (${res.status})`)
      }
      const data = await loadGraph()
      setGraph(data)
      setError(null)
      await refreshChanges()
      await refreshNotes()
    } catch (err: unknown) {
      setReloadError(err instanceof Error ? err.message : String(err))
    } finally {
      setReloading(false)
    }
  }, [refreshChanges, refreshNotes])

  const locateNode = useCallback((nodeId: string) => {
    lastLocatedPathRef.current = nodeId
    setFocusPath(nodeId)
    graphRef.current?.locateNode(nodeId)
  }, [])

  const locateNodeFromExplorer = useCallback((nodeId: string) => {
    locateFromExplorerRef.current = true
    lastLocatedPathRef.current = nodeId
    setFocusPath(nodeId)
    graphRef.current?.locateNode(nodeId)
  }, [])

  const onVisibleNodeIds = useCallback((ids: string[]) => {
    setVisibleNodeIds(ids)
  }, [])

  const onAnchorChange = useCallback((nodeId: string | null) => {
    canvasAnchorRef.current = nodeId
    if (nodeId) {
      lastLocatedPathRef.current = nodeId
      setFocusPath(nodeId)
    }
    if (nodeId && explorerOpenRef.current) {
      explorerRef.current?.revealPath(nodeId, { focus: false })
    }
  }, [])

  const onHopActiveChange = useCallback((active: boolean) => {
    hopActiveRef.current = active
  }, [])

  if (error) {
    return <div className="status-error">{error}</div>
  }
  if (!graph) {
    return <div className="status-loading">Loading graph…</div>
  }

  const taggedCount = graph.nodes.filter((n) => n.tags.length > 0).length
  const changeHunks =
    file && selectedNoteId && noteSet
      ? noteNodesToHunks(noteSet).filter((h) => h.path === file.path)
      : file && changeSet
        ? changeSet.nodes.filter((h) => h.path === file.path)
        : []
  const hasFileSession = Boolean(file || fileLoading || fileError)
  const showSplitWorkspace = splitView && hasFileSession
  const fileViewerOpen = hasFileSession && (splitView || modalOpen)
  const showGraphInSplit = showSplitWorkspace && !fileZoomed

  const graphView = (
    <GraphView
      ref={graphRef}
      graph={graph}
      selectedTags={selectedTags}
      viewMode={viewMode}
      tagMatchMode={tagMatchMode}
      changePaths={changePaths}
      notePaths={notePaths}
      onNodeOpen={openNode}
      onVisibleNodeIds={onVisibleNodeIds}
      onAnchorChange={onAnchorChange}
      onHopActiveChange={onHopActiveChange}
      reviewEnabled={reviewEnabled}
      reviewOpen={reviewOpen}
      onReviewToggle={() => setReviewOpen((open) => !open)}
      pathGlow={pathGlow}
      noteSummaries={noteSummaries}
      selectedNoteId={selectedNoteId}
      onNoteChange={selectNoteId}
      notesGuideEnabled={notesGuideEnabled}
      notesGuideOpen={notesGuideOpen}
      onNotesGuideToggle={() => setNotesGuideOpen((open) => !open)}
    />
  )

  const fileViewer = (
    <FileModal
      open={fileViewerOpen}
      loading={fileLoading}
      error={fileError}
      file={file}
      theme={theme}
      tags={modalTags}
      tagColors={modalTagColors}
      changeHunks={changeHunks}
      importTargets={importTargets}
      jumpToLine={jumpToLine}
      variant={splitView ? 'panel' : 'modal'}
      onClose={closeFile}
      onSplitChange={handleSplitChange}
      onExpandedChange={splitView ? setFileZoomed : undefined}
      onJumpToLineConsumed={() => setJumpToLine(null)}
      onOpenDefinition={openDefinition}
    />
  )

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <h1>tag-tree</h1>
          <div className="meta">
            {graph.nodes.length} files · {graph.edges.length} edges ·{' '}
            {taggedCount} tagged
          </div>
        </div>
        <div className="topbar-right">
          <button
            type="button"
            className="toolbar-btn"
            aria-pressed={explorerOpen}
            onClick={() => setExplorerOpen((open) => !open)}
            title="File explorer (Ctrl+Shift+E). Pane focus: Ctrl+←/→ or Ctrl+Shift+H/L"
          >
            Explorer
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() =>
              setTheme((current) => (current === 'light' ? 'dark' : 'light'))
            }
            title={theme === 'light' ? 'Switch to night mode' : 'Switch to day mode'}
          >
            {theme === 'light' ? 'Night' : 'Day'}
          </button>
          <button
            type="button"
            className={`burger-btn${menuOpen ? ' open' : ''}`}
            aria-label={menuOpen ? 'Hide menu' : 'Show menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="menu-panel">
          <div className="menu-meta">
            root: {graph.root} · {graph.generatedAt}
            {graph.fileBase ? ` · file-base: ${graph.fileBase}` : ''}
            {reloadError && <div className="toolbar-error">{reloadError}</div>}
          </div>
          <div className="toolbar-actions">
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => void reloadGraph()}
              disabled={reloading}
            >
              {reloading ? 'Reloading…' : 'Reload'}
            </button>
            <label className="change-select-label">
              <span className="sr-only">View mode</span>
              <select
                className="toolbar-select"
                value={viewMode}
                onChange={(event) =>
                  setViewMode(event.target.value as ViewMode)
                }
                title="Highlight tags/subtree, only highlighted nodes, only agent-changed nodes, or only AI-note nodes"
              >
                <option value="highlight">Mode: Highlight</option>
                <option value="isolate">Mode: Only highlighted</option>
                <option value="changed">Mode: Only changed</option>
                <option value="notes">Mode: Only notes</option>
              </select>
            </label>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() =>
                setTagMatchMode((mode) => (mode === 'any' ? 'all' : 'any'))
              }
              title={
                tagMatchMode === 'any'
                  ? 'Match any selected tag (OR). Click for intersection (AND).'
                  : 'Match all selected tags (AND). Click for any (OR).'
              }
            >
              {tagMatchMode === 'any' ? 'Tags: Any' : 'Tags: Intersection'}
            </button>
            <label className="change-select-label">
              <span className="sr-only">Agent changes</span>
              <select
                className="toolbar-select"
                value={selectedChangeId}
                onChange={(event) => selectChangeId(event.target.value)}
                title="Highlight nodes from an agent change set"
              >
                <option value="">No changes</option>
                {changeSummaries.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="toolbar-btn"
              aria-pressed={pathGlow}
              onClick={() => setPathGlow((on) => !on)}
              title="Soft background glows grouping visible nodes by top-level path (skip src). Pulse when a node is selected."
            >
              {pathGlow ? 'Path glow: On' : 'Path glow: Off'}
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => setDocsOpen(true)}
            >
              Documentation
            </button>
          </div>
          <TagFilter
            tags={graph.configTags}
            selected={selectedTags}
            onChange={setSelectedTags}
          />
        </div>
      )}

      <div className="app-main">
        <div className="app-workspace">
          {showSplitWorkspace ? (
            <div
              ref={workspaceRef}
              className={`split-workspace${fileZoomed ? ' split-workspace-zoomed' : ''}`}
            >
              <div
                className="split-pane split-pane-file"
                style={
                  fileZoomed
                    ? undefined
                    : {
                        flexBasis: `${splitRatio * 100}%`,
                        flexGrow: 0,
                        flexShrink: 0,
                      }
                }
              >
                {fileViewer}
              </div>
              {showGraphInSplit ? (
                <>
                  <div
                    className="split-resizer"
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize file and graph panes"
                    aria-valuemin={Math.round(SPLIT_MIN * 100)}
                    aria-valuemax={Math.round(SPLIT_MAX * 100)}
                    aria-valuenow={Math.round(splitRatio * 100)}
                    onPointerDown={onResizerPointerDown}
                  />
                  <div className="split-pane split-pane-graph">{graphView}</div>
                </>
              ) : null}
            </div>
          ) : (
            <>
              {graphView}
              {fileViewer}
            </>
          )}
        </div>
        <FileExplorer
          ref={explorerRef}
          open={explorerOpen}
          paths={visibleNodeIds}
          onClose={() => setExplorerOpen(false)}
          onOpen={openNodeFromExplorer}
          onLocate={locateNodeFromExplorer}
        />
      </div>
      <DocsModal open={docsOpen} onClose={() => setDocsOpen(false)} />
      {reviewGuide && reviewEnabled ? (
        <ReviewGuidePanel
          open={reviewOpen}
          review={reviewGuide}
          onClose={() => setReviewOpen(false)}
          onPath={openReviewPath}
        />
      ) : null}
      {notesGuide && notesGuideEnabled && noteSet ? (
        <AiNotesGuidePanel
          open={notesGuideOpen}
          label={noteSet.label}
          guide={notesGuide}
          onClose={() => setNotesGuideOpen(false)}
          onPath={openReviewPath}
        />
      ) : null}
    </div>
  )
}
