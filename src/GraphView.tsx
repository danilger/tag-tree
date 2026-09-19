import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  forwardRef,
  type CSSProperties,
  type MouseEvent,
  type Ref,
} from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Handle,
  Panel,
  Position,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react'
import dagre from '@dagrejs/dagre'
import '@xyflow/react/dist/style.css'

import { PathGlowOverlay } from './PathGlowOverlay'
import { AiNotesPicker } from './AiNotesPicker'
import type {
  ConfigNode,
  GraphData,
  GraphEdge,
  NoteSummary,
  TagMatchMode,
  ViewMode,
} from './types'

const NODE_WIDTH = 240
const NODE_HEIGHT = 80

const EMPTY_CHANGE_PATHS = new Set<string>()

type FocusMode = 'deps' | 'ai'
type FocusState = { mode: FocusMode; rootId: string } | null

type FileNodeData = {
  path: string
  title?: string
  /** Config node description — tooltip only, not shown on the node body. */
  description?: string
  tags: string[]
  tagColors: Record<string, string>
  /** tag id → description from configTags */
  tagDescriptions: Record<string, string>
  /** tag id → label from configTags */
  tagLabels: Record<string, string>
  aiSubtreeNodes?: string[]
  nodeColor?: string
  textColor?: string
  bgColor?: string
  changeOverlay: boolean
  noteOverlay: boolean
  highlighted: boolean
  dimmed: boolean
  focusActiveDeps: boolean
  focusActiveAi: boolean
  searchBlink: boolean
  onFocusSubtree: (mode: FocusMode, nodeId: string) => void
  onOpen?: (nodeId: string) => void
  /** Select/focus node without opening the file (Ctrl+click). */
  onSelect?: (nodeId: string) => void
}

function FileNode({ data }: NodeProps & { data: FileNodeData }) {
  const style: CSSProperties = { opacity: data.dimmed ? 0.22 : 1 }
  // Change/note overlays own fill via CSS classes (skip solid bgColor).
  if (!data.changeOverlay && !data.noteOverlay) {
    if (data.nodeColor) {
      style.borderColor = data.nodeColor
      style.boxShadow = `0 0 0 2px color-mix(in srgb, ${data.nodeColor} 35%, transparent)`
    }
    if (data.textColor) {
      style.color = data.textColor
    }
    if (data.bgColor) {
      style.backgroundColor = data.bgColor
    }
  }

  const colored = Boolean(
    data.changeOverlay ||
      data.noteOverlay ||
      data.nodeColor ||
      data.textColor ||
      data.bgColor,
  )

  const tagDescEntries = data.tags
    .map((tag) => {
      const description = data.tagDescriptions[tag]
      if (!description) return null
      return {
        tag,
        label: data.tagLabels[tag] || tag,
        description,
      }
    })
    .filter((entry): entry is { tag: string; label: string; description: string } =>
      Boolean(entry),
    )

  const showTooltip =
    tagDescEntries.length > 0 || Boolean(data.title) || Boolean(data.description)

  const pathCopyTitle = `Click to copy path and open. Ctrl+click focuses the node for hop (h/l) without opening. Pass to an agent: /tag-tree-ai-subtree ${data.path}`

  async function onPathClick(event: MouseEvent) {
    event.stopPropagation()
    if (event.ctrlKey || event.metaKey) {
      data.onSelect?.(data.path)
      return
    }
    try {
      await navigator.clipboard.writeText(data.path)
    } catch {
      /* ignore */
    }
    // Path covers most of untitled nodes; still open so the click is not a no-op.
    data.onOpen?.(data.path)
  }

  return (
    <div
      className={`file-node${data.highlighted ? ' highlighted' : ''}${colored ? ' colored' : ''}${data.changeOverlay ? ' change-overlay' : ''}${data.noteOverlay ? ' note-overlay' : ''}${data.searchBlink ? ' search-blink' : ''}`}
      style={style}
      title="Click to open file. Ctrl+click to focus for hop navigation (h/l)."
    >
      <div className="subtree-focus-btns">
        {data.aiSubtreeNodes && data.aiSubtreeNodes.length > 0 ? (
          <button
            type="button"
            className={`subtree-focus-btn ai-subtree-focus-btn nodrag nopan${data.focusActiveAi ? ' active' : ''}`}
            title={
              data.focusActiveAi
                ? 'Clear AI subtree focus'
                : 'Highlight AI-curated subtree'
            }
            aria-label={
              data.focusActiveAi
                ? 'Clear AI subtree focus'
                : 'Highlight AI-curated subtree'
            }
            aria-pressed={data.focusActiveAi}
            onClick={(event) => {
              event.stopPropagation()
              data.onFocusSubtree('ai', data.path)
            }}
            onMouseDown={(event) => event.stopPropagation()}
          />
        ) : null}
        <button
          type="button"
          className={`subtree-focus-btn nodrag nopan${data.focusActiveDeps ? ' active' : ''}`}
          title={
            data.focusActiveDeps
              ? 'Clear dependency subtree focus'
              : 'Highlight dependency subtree'
          }
          aria-label={
            data.focusActiveDeps
              ? 'Clear dependency subtree focus'
              : 'Highlight dependency subtree'
          }
          aria-pressed={data.focusActiveDeps}
          onClick={(event) => {
            event.stopPropagation()
            data.onFocusSubtree('deps', data.path)
          }}
          onMouseDown={(event) => event.stopPropagation()}
        />
      </div>
      <Handle type="target" position={Position.Left} />
      {data.title ? (
        <>
          <div className="title">{data.title}</div>
          <button
            type="button"
            className="path path-secondary path-copy nodrag nopan"
            title={pathCopyTitle}
            onClick={(event) => void onPathClick(event)}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {data.path}
          </button>
        </>
      ) : (
        <button
          type="button"
          className="path path-copy nodrag nopan"
          title={pathCopyTitle}
          onClick={(event) => void onPathClick(event)}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {data.path}
        </button>
      )}
      {data.tags.length > 0 && (
        <div className="badges">
          {data.tags.map((tag) => {
            const color = data.tagColors[tag]
            return (
              <span
                key={tag}
                className="badge"
                style={
                  color
                    ? { backgroundColor: color, color: '#fff' }
                    : undefined
                }
              >
                {tag}
              </span>
            )
          })}
        </div>
      )}
      {showTooltip ? (
        <div className="node-tooltip" role="tooltip">
          {tagDescEntries.length > 0 ? (
            <div className="node-tooltip-section">
              <div className="node-tooltip-heading">Tags</div>
              <ul className="node-tooltip-list">
                {tagDescEntries.map((entry) => (
                  <li key={entry.tag}>
                    <span className="node-tooltip-label">{entry.label}</span>
                    <span className="node-tooltip-text">{entry.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {data.title || data.description ? (
            <div className="node-tooltip-section">
              <div className="node-tooltip-heading">Title</div>
              {data.title ? (
                <div className="node-tooltip-title">{data.title}</div>
              ) : null}
              {data.description ? (
                <div className="node-tooltip-text">{data.description}</div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

const nodeTypes = { file: FileNode }

function normalizeSearchQuery(raw: string, displayPrefix: string): string {
  let p = raw.trim().replace(/\\/g, '/')
  while (p.startsWith('./')) p = p.slice(2)
  const prefix = displayPrefix.replace(/^\/+|\/+$/g, '')
  if (prefix && (p === prefix || p.startsWith(`${prefix}/`))) {
    p = p.slice(prefix.length).replace(/^\//, '')
  }
  return p
}

function findNodeByPath(nodes: Node[], query: string): Node | undefined {
  if (!query) return undefined
  const exact = nodes.find((n) => n.id === query)
  if (exact) return exact
  const lower = query.toLowerCase()
  const ci = nodes.find((n) => n.id.toLowerCase() === lower)
  if (ci) return ci
  const suffix = `/${lower}`
  const ends = nodes.filter((n) => n.id.toLowerCase().endsWith(suffix) || n.id.toLowerCase() === lower)
  if (ends.length === 1) return ends[0]
  if (ends.length > 1) {
    return ends.sort((a, b) => a.id.length - b.id.length)[0]
  }
  const includes = nodes.filter((n) => n.id.toLowerCase().includes(lower))
  if (includes.length === 1) return includes[0]
  return undefined
}

function shouldIgnoreSearchHotkey(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (target.closest('.monaco-editor, .modal-backdrop, .file-panel textarea')) {
    return true
  }
  const tag = target.tagName
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag === 'INPUT' && !target.closest('.node-search')) return true
  return false
}

/**
 * Top-right search: button + Ctrl/Cmd+F. Centers and zooms to a node by path.
 */
  function NodeSearchPanel({
  displayPrefix,
  locateNode,
  reviewEnabled = false,
  reviewOpen = false,
  onReviewToggle,
  noteSummaries = [],
  selectedNoteId = '',
  onNoteChange,
  notesGuideEnabled = false,
  notesGuideOpen = false,
  onNotesGuideToggle,
}: {
  displayPrefix: string
  locateNode: (nodeId: string) => boolean
  reviewEnabled?: boolean
  reviewOpen?: boolean
  onReviewToggle?: () => void
  noteSummaries?: NoteSummary[]
  selectedNoteId?: string
  onNoteChange?: (id: string) => void
  notesGuideEnabled?: boolean
  notesGuideOpen?: boolean
  onNotesGuideToggle?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  const openSearch = useCallback(() => {
    setOpen(true)
    setError(null)
  }, [])

  const closeSearch = useCallback(() => {
    setOpen(false)
    setError(null)
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.code === 'KeyF') {
        if (shouldIgnoreSearchHotkey(event.target)) return
        event.preventDefault()
        openSearch()
        return
      }
      if (event.key === 'Escape' && open) {
        event.preventDefault()
        closeSearch()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, openSearch, closeSearch])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [open])

  const goToQuery = useCallback(
    (raw: string) => {
      const normalized = normalizeSearchQuery(raw, displayPrefix)
      if (!normalized) {
        setError('Enter a file path')
        return
      }
      if (!locateNode(normalized)) {
        setError(`Not found: ${normalized}`)
        return
      }
      setError(null)
    },
    [displayPrefix, locateNode],
  )

  return (
    <Panel position="top-right" className="node-search-panel">
      <div className="node-search-row">
        <button
          type="button"
          className={`toolbar-btn review-open-btn${reviewOpen ? ' open' : ''}`}
          title={
            reviewEnabled
              ? 'Review guide for this change set (Shift+R)'
              : 'No review guide on the selected change set'
          }
          disabled={!reviewEnabled}
          aria-pressed={reviewOpen}
          onClick={() => onReviewToggle?.()}
        >
          Review
        </button>
        <AiNotesPicker
          notes={noteSummaries}
          selectedId={selectedNoteId}
          onChange={(id) => onNoteChange?.(id)}
        />
        <button
          type="button"
          className={`toolbar-btn ai-notes-open-btn${notesGuideOpen ? ' open' : ''}`}
          title={
            notesGuideEnabled
              ? 'AI notes guide (Shift+N)'
              : 'Select an AI note first'
          }
          disabled={!notesGuideEnabled}
          aria-pressed={notesGuideOpen}
          onClick={() => onNotesGuideToggle?.()}
        >
          Notes
        </button>
        {open ? (
          <form
            className="node-search"
            onSubmit={(event) => {
              event.preventDefault()
              goToQuery(query)
            }}
          >
            <label className="sr-only" htmlFor={inputId}>
              Find node by path
            </label>
            <input
              ref={inputRef}
              id={inputId}
              className="node-search-input"
              type="search"
              value={query}
              placeholder="shared/api/core.ts"
              autoComplete="off"
              spellCheck={false}
              title="Find node by path (Enter). Escape closes."
              onChange={(event) => {
                setQuery(event.target.value)
                setError(null)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault()
                  event.stopPropagation()
                  closeSearch()
                }
              }}
            />
            <button type="submit" className="toolbar-btn" title="Go to node">
              Go
            </button>
            <button
              type="button"
              className="toolbar-btn"
              title="Close search (Esc)"
              onClick={closeSearch}
            >
              Close
            </button>
            {error ? <div className="node-search-error">{error}</div> : null}
          </form>
        ) : (
          <button
            type="button"
            className="toolbar-btn node-search-open"
            title="Find node by path (Ctrl+F)"
            onClick={openSearch}
          >
            Search
          </button>
        )}
      </div>
    </Panel>
  )
}

function normalizeConfigPath(raw: string): string {
  let p = raw.trim().replace(/\\/g, '/')
  while (p.startsWith('./')) p = p.slice(2)
  return p
}

function buildConfigNodeMap(
  entries: ConfigNode[] | undefined,
): Map<string, ConfigNode> {
  const map = new Map<string, ConfigNode>()
  for (const entry of entries ?? []) {
    const id = normalizeConfigPath(entry.path)
    if (id) map.set(id, entry)
  }
  return map
}

function buildTagColorMap(
  graph: GraphData,
): Record<string, string> {
  const colors: Record<string, string> = {}
  for (const entry of graph.configTags) {
    if (typeof entry.color === 'string' && entry.color.trim()) {
      colors[entry.tag] = entry.color.trim()
    }
  }
  return colors
}

function buildTagMetaMaps(graph: GraphData): {
  tagDescriptions: Record<string, string>
  tagLabels: Record<string, string>
} {
  const tagDescriptions: Record<string, string> = {}
  const tagLabels: Record<string, string> = {}
  for (const entry of graph.configTags) {
    if (entry.label) tagLabels[entry.tag] = entry.label
    if (typeof entry.description === 'string' && entry.description.trim()) {
      tagDescriptions[entry.tag] = entry.description.trim()
    }
  }
  return { tagDescriptions, tagLabels }
}

function resolveNodeColor(
  tags: string[],
  selectedTags: string[],
  highlighted: boolean,
  configNode: ConfigNode | undefined,
  tagColors: Record<string, string>,
): string | undefined {
  if (configNode?.color?.trim()) return configNode.color.trim()
  if (!highlighted) return undefined

  for (const tag of selectedTags) {
    if (tags.includes(tag) && tagColors[tag]) return tagColors[tag]
  }
  for (const tag of tags) {
    if (tagColors[tag]) return tagColors[tag]
  }
  return undefined
}

/** BFS along outgoing edges (file → imports). Includes the root. */
function collectDescendants(
  rootId: string,
  edges: GraphEdge[],
): Set<string> {
  const adj = new Map<string, string[]>()
  for (const e of edges) {
    const list = adj.get(e.source)
    if (list) list.push(e.target)
    else adj.set(e.source, [e.target])
  }

  const seen = new Set<string>()
  const queue = [rootId]
  seen.add(rootId)
  while (queue.length > 0) {
    const id = queue.shift()!
    for (const next of adj.get(id) ?? []) {
      if (seen.has(next)) continue
      seen.add(next)
      queue.push(next)
    }
  }
  return seen
}

function collectAiSubtree(
  rootId: string,
  listed: string[] | undefined,
  visible: Set<string>,
): Set<string> {
  const set = new Set<string>()
  if (visible.has(rootId)) set.add(rootId)
  for (const raw of listed ?? []) {
    const id = normalizeConfigPath(raw)
    if (id && visible.has(id)) set.add(id)
  }
  return set
}

function layoutGraph(
  graph: GraphData,
  selectedTags: string[],
  viewMode: ViewMode,
  tagMatchMode: TagMatchMode,
  changePaths: Set<string>,
  notePaths: Set<string>,
  focus: FocusState,
  onFocusSubtree: (mode: FocusMode, nodeId: string) => void,
  onOpen: ((nodeId: string) => void) | undefined,
  onSelect: ((nodeId: string) => void) | undefined,
  searchBlinkId: string | null,
): { nodes: Node[]; edges: Edge[] } {
  const filterOn = selectedTags.length > 0
  const match = (tags: string[]) => {
    if (!filterOn) return false
    return tagMatchMode === 'all'
      ? selectedTags.every((t) => tags.includes(t))
      : selectedTags.some((t) => tags.includes(t))
  }

  const inChange = (id: string) => changePaths.has(normalizeConfigPath(id))
  const inNote = (id: string) => notePaths.has(normalizeConfigPath(id))
  const configByPath = buildConfigNodeMap(graph.configNodes)
  const allIds = new Set(graph.nodes.map((n) => n.id))

  /** Nodes that Highlight mode would treat as highlighted (subtree or tags). */
  function computeHighlightIds(): Set<string> | null {
    if (focus != null && allIds.has(focus.rootId)) {
      if (focus.mode === 'deps') {
        return collectDescendants(focus.rootId, graph.edges)
      }
      const listed = configByPath.get(normalizeConfigPath(focus.rootId))
        ?.ai_subtree_nodes
      return collectAiSubtree(focus.rootId, listed, allIds)
    }
    if (filterOn) {
      return new Set(graph.nodes.filter((n) => match(n.tags)).map((n) => n.id))
    }
    return null
  }

  let sourceNodes = graph.nodes
  if (viewMode === 'changed') {
    sourceNodes = graph.nodes.filter((n) => inChange(n.id))
  } else if (viewMode === 'notes') {
    sourceNodes = graph.nodes.filter((n) => inNote(n.id))
  } else if (viewMode === 'isolate') {
    const highlightIds = computeHighlightIds()
    sourceNodes = highlightIds
      ? graph.nodes.filter((n) => highlightIds.has(n.id))
      : []
  }

  const visible = new Set(sourceNodes.map((n) => n.id))
  const sourceEdges =
    viewMode === 'changed' ||
    viewMode === 'notes' ||
    viewMode === 'isolate'
      ? graph.edges.filter((e) => visible.has(e.source) && visible.has(e.target))
      : graph.edges

  let focusSet: Set<string> | null = null
  if (focus != null && visible.has(focus.rootId)) {
    if (focus.mode === 'deps') {
      focusSet = collectDescendants(focus.rootId, sourceEdges)
    } else {
      const listed = configByPath.get(normalizeConfigPath(focus.rootId))
        ?.ai_subtree_nodes
      focusSet = collectAiSubtree(focus.rootId, listed, visible)
    }
  }

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 28, ranksep: 64 })

  for (const n of sourceNodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }
  for (const e of sourceEdges) {
    g.setEdge(e.source, e.target)
  }
  dagre.layout(g)

  const tagColors = buildTagColorMap(graph)
  const { tagDescriptions, tagLabels } = buildTagMetaMaps(graph)

  const nodes: Node[] = sourceNodes.map((n) => {
    const pos = g.node(n.id)
    const tagHighlighted = match(n.tags)
    const inFocus = focusSet?.has(n.id) ?? false
    const highlighted = focusSet ? inFocus : tagHighlighted
    const dimmed = focusSet
      ? !inFocus
      : viewMode === 'highlight' && filterOn && !tagHighlighted
    const configNode = configByPath.get(normalizeConfigPath(n.id))
    const changeOverlay = inChange(n.id)
    const noteOverlay = !changeOverlay && inNote(n.id)
    const nodeColor = resolveNodeColor(
      n.tags,
      selectedTags,
      tagHighlighted || inFocus,
      configNode,
      tagColors,
    )
    const textColor = configNode?.textColor?.trim() || undefined
    const bgColor = configNode?.bgColor?.trim() || undefined
    const aiSubtreeNodes = configNode?.ai_subtree_nodes
    return {
      id: n.id,
      type: 'file',
      position: {
        x: (pos?.x ?? 0) - NODE_WIDTH / 2,
        y: (pos?.y ?? 0) - NODE_HEIGHT / 2,
      },
      data: {
        path: n.id,
        title: configNode?.title,
        description: configNode?.description?.trim() || undefined,
        tags: n.tags,
        tagColors,
        tagDescriptions,
        tagLabels,
        aiSubtreeNodes:
          aiSubtreeNodes && aiSubtreeNodes.length > 0
            ? aiSubtreeNodes
            : undefined,
        nodeColor,
        textColor,
        bgColor,
        changeOverlay,
        noteOverlay,
        highlighted,
        dimmed,
        focusActiveDeps: focus?.mode === 'deps' && focus.rootId === n.id,
        focusActiveAi: focus?.mode === 'ai' && focus.rootId === n.id,
        searchBlink: searchBlinkId === n.id,
        onFocusSubtree,
        onOpen,
        onSelect,
      } satisfies FileNodeData,
    }
  })

  const nodeTags = new Map(sourceNodes.map((n) => [n.id, n.tags]))
  const edges: Edge[] = sourceEdges.map((e, i) => {
    const srcMatch = match(nodeTags.get(e.source) || [])
    const tgtMatch = match(nodeTags.get(e.target) || [])
    const inSubtree =
      focusSet != null &&
      focusSet.has(e.source) &&
      focusSet.has(e.target)

    let dimmed: boolean
    let animated: boolean
    let stroke: string
    let opacity: number

    if (focusSet) {
      dimmed = !inSubtree
      animated = inSubtree
      stroke = inSubtree ? '#0969da' : '#8b949e'
      opacity = dimmed ? 0.15 : 0.85
    } else {
      dimmed =
        viewMode === 'highlight' && filterOn && !srcMatch && !tgtMatch
      animated = Boolean(filterOn && (srcMatch || tgtMatch))
      stroke = srcMatch || tgtMatch ? '#0969da' : '#8b949e'
      opacity = dimmed ? 0.15 : 0.7
    }

    return {
      id: `e-${i}-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      animated,
      style: {
        opacity,
        stroke,
      },
    }
  })

  return { nodes, edges }
}

type HopDirection = 'forward' | 'backward'

type HopState = {
  direction: HopDirection
  anchorId: string
  targets: string[]
  /** Selected neighbor index; null while in group hop before digit/j/k. */
  index: number | null
  phase: 'hop' | 'preview'
}

type GraphViewProps = {
  graph: GraphData
  selectedTags: string[]
  viewMode: ViewMode
  tagMatchMode: TagMatchMode
  changePaths?: Set<string>
  notePaths?: Set<string>
  onNodeOpen?: (nodeId: string) => void
  onVisibleNodeIds?: (ids: string[]) => void
  onAnchorChange?: (nodeId: string | null) => void
  onHopActiveChange?: (active: boolean) => void
  reviewEnabled?: boolean
  reviewOpen?: boolean
  onReviewToggle?: () => void
  /** Soft path-family background glows (default off in App). */
  pathGlow?: boolean
  noteSummaries?: NoteSummary[]
  selectedNoteId?: string
  onNoteChange?: (id: string) => void
  notesGuideEnabled?: boolean
  notesGuideOpen?: boolean
  onNotesGuideToggle?: () => void
}

export type GraphViewHandle = {
  locateNode: (
    nodeId: string,
    options?: { focus?: boolean },
  ) => boolean
  focusCanvas: () => void
  getAnchorId: () => string | null
  isHopActive: () => boolean
}

function shouldIgnoreHopHotkey(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (
    target.closest(
      '.monaco-editor, .modal-backdrop, .explorer-panel, .node-search, .file-panel textarea',
    )
  ) {
    return true
  }
  const tag = target.tagName
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag === 'INPUT') return true
  return false
}

function collectHopTargets(
  nodes: Node[],
  edges: Edge[],
  anchorId: string,
  direction: HopDirection,
): string[] {
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const ids = new Set<string>()
  for (const e of edges) {
    if (direction === 'forward' && e.source === anchorId) ids.add(e.target)
    if (direction === 'backward' && e.target === anchorId) ids.add(e.source)
  }
  return [...ids].sort((a, b) => {
    const na = nodeById.get(a)
    const nb = nodeById.get(b)
    const ya = na?.position.y ?? 0
    const yb = nb?.position.y ?? 0
    if (ya !== yb) return ya - yb
    const xa = na?.position.x ?? 0
    const xb = nb?.position.x ?? 0
    if (xa !== xb) return xa - xb
    return a.localeCompare(b)
  })
}

function applyHopNodes(
  baseNodes: Node[],
  selectedId: string | null,
  hop: HopState | null,
): Node[] {
  const hopSet =
    hop != null ? new Set<string>([hop.anchorId, ...hop.targets]) : null
  const previewId =
    hop?.phase === 'preview' && hop.index != null
      ? hop.targets[hop.index]
      : null

  return baseNodes.map((n) => {
    const data = n.data as FileNodeData
    if (!hopSet || !hop) {
      return {
        ...n,
        selected: selectedId != null && n.id === selectedId,
        data,
      }
    }
    const inHop = hopSet.has(n.id)
    return {
      ...n,
      selected:
        n.id === hop.anchorId ||
        (previewId != null && n.id === previewId) ||
        (selectedId != null && n.id === selectedId),
      data: {
        ...data,
        dimmed: !inHop,
        highlighted:
          n.id === hop.anchorId || (previewId != null && n.id === previewId),
      },
    }
  })
}

function applyHopEdges(baseEdges: Edge[], hop: HopState | null): Edge[] {
  if (!hop) {
    return baseEdges.map((e) => ({
      ...e,
      label: undefined,
      labelStyle: undefined,
      labelBgStyle: undefined,
      labelBgPadding: undefined,
      labelBgBorderRadius: undefined,
      className: undefined,
    }))
  }

  const labelByEdgeKey = new Map<string, number>()
  hop.targets.forEach((targetId, index) => {
    const key =
      hop.direction === 'forward'
        ? `${hop.anchorId}→${targetId}`
        : `${targetId}→${hop.anchorId}`
    labelByEdgeKey.set(key, index)
  })

  const hopNodeSet = new Set([hop.anchorId, ...hop.targets])

  return baseEdges.map((e) => {
    const key = `${e.source}→${e.target}`
    const index = labelByEdgeKey.get(key)
    const touchesHop =
      hopNodeSet.has(e.source) && hopNodeSet.has(e.target) && index != null
    if (!touchesHop) {
      return {
        ...e,
        label: undefined,
        className: 'hop-edge-dim',
        style: {
          ...e.style,
          opacity: 0.12,
        },
      }
    }
    const active = hop.phase === 'preview' && hop.index === index
    return {
      ...e,
      label: String(index),
      labelStyle: {
        fill: active ? '#ffffff' : '#0d1117',
        fontWeight: 700,
        fontSize: 13,
      },
      labelBgStyle: {
        fill: active ? '#0969da' : '#ffffff',
        stroke: '#0969da',
        strokeWidth: 1.5,
      },
      labelBgPadding: [7, 5] as [number, number],
      labelBgBorderRadius: 4,
      className: active ? 'hop-edge hop-edge-active' : 'hop-edge',
      animated: true,
      style: {
        ...e.style,
        opacity: 0.95,
        stroke: active ? '#0969da' : '#58a6ff',
        strokeWidth: active ? 2.5 : 2,
      },
    }
  })
}

/**
 * React Flow canvas with dagre layout and tag-based highlight / isolate.
 */
export const GraphView = forwardRef<GraphViewHandle, GraphViewProps>(
  function GraphView(props, ref) {
    return (
      <ReactFlowProvider>
        <GraphViewInner {...props} handleRef={ref} />
      </ReactFlowProvider>
    )
  },
)

function GraphViewInner({
  graph,
  selectedTags,
  viewMode,
  tagMatchMode,
  changePaths,
  notePaths,
  onNodeOpen,
  onVisibleNodeIds,
  onAnchorChange,
  onHopActiveChange,
  reviewEnabled = false,
  reviewOpen = false,
  onReviewToggle,
  pathGlow = false,
  noteSummaries = [],
  selectedNoteId = '',
  onNoteChange,
  notesGuideEnabled = false,
  notesGuideOpen = false,
  onNotesGuideToggle,
  handleRef,
}: GraphViewProps & {
  handleRef: Ref<GraphViewHandle>
}) {
  const paths = changePaths ?? EMPTY_CHANGE_PATHS
  const notes = notePaths ?? EMPTY_CHANGE_PATHS
  const [focus, setFocus] = useState<FocusState>(null)
  const [searchBlinkId, setSearchBlinkId] = useState<string | null>(null)
  const searchBlinkTimerRef = useRef<number | null>(null)
  const [hop, setHop] = useState<HopState | null>(null)
  const hopRef = useRef<HopState | null>(null)
  const digitBufferRef = useRef('')
  const digitTimerRef = useRef<number | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const onAnchorChangeRef = useRef(onAnchorChange)
  onAnchorChangeRef.current = onAnchorChange
  const onHopActiveChangeRef = useRef(onHopActiveChange)
  onHopActiveChangeRef.current = onHopActiveChange
  const [glowActiveId, setGlowActiveId] = useState<string | null>(null)
  const { fitView, getNodes, getEdges } = useReactFlow()

  /** Keep hopRef in sync immediately so digit/j/k right after l/h see the new state. */
  const setHopState = useCallback((next: HopState | null) => {
    hopRef.current = next
    setHop(next)
  }, [])

  const onFocusSubtree = useCallback((mode: FocusMode, nodeId: string) => {
    setFocus((current) => {
      if (current?.mode === mode && current.rootId === nodeId) return null
      return { mode, rootId: nodeId }
    })
  }, [])

  const startBlink = useCallback((nodeId: string, durationMs = 3000) => {
    if (searchBlinkTimerRef.current != null) {
      window.clearTimeout(searchBlinkTimerRef.current)
    }
    setSearchBlinkId(nodeId)
    searchBlinkTimerRef.current = window.setTimeout(() => {
      setSearchBlinkId(null)
      searchBlinkTimerRef.current = null
    }, durationMs)
  }, [])

  const clearDigitBuffer = useCallback(() => {
    digitBufferRef.current = ''
    if (digitTimerRef.current != null) {
      window.clearTimeout(digitTimerRef.current)
      digitTimerRef.current = null
    }
  }, [])

  const clearHop = useCallback(() => {
    clearDigitBuffer()
    setHopState(null)
  }, [clearDigitBuffer, setHopState])

  useEffect(() => {
    return () => {
      if (searchBlinkTimerRef.current != null) {
        window.clearTimeout(searchBlinkTimerRef.current)
      }
      if (digitTimerRef.current != null) {
        window.clearTimeout(digitTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    // Reset focus/hop when the graph or filter inputs change — not when only
    // viewMode flips (Only highlighted must keep an active subtree).
    setFocus(null)
    clearHop()
  }, [graph, selectedTags, tagMatchMode, paths, clearHop])

  useEffect(() => {
    onHopActiveChangeRef.current?.(hop != null)
  }, [hop])

  const selectNodeOnlyRef = useRef<(nodeId: string) => void>(() => {})
  const onSelectBridge = useCallback((nodeId: string) => {
    selectNodeOnlyRef.current(nodeId)
  }, [])

  const layout = useMemo(
    () =>
      layoutGraph(
        graph,
        selectedTags,
        viewMode,
        tagMatchMode,
        paths,
        notes,
        focus,
        onFocusSubtree,
        onNodeOpen,
        onSelectBridge,
        searchBlinkId,
      ),
    [
      graph,
      selectedTags,
      viewMode,
      tagMatchMode,
      paths,
      notes,
      focus,
      onFocusSubtree,
      onNodeOpen,
      onSelectBridge,
      searchBlinkId,
    ],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(layout.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(layout.edges)
  const selectedNodeIdRef = useRef<string | null>(null)

  useEffect(() => {
    const selectedId = selectedNodeIdRef.current
    setNodes(applyHopNodes(layout.nodes, selectedId, hop))
    setEdges(applyHopEdges(layout.edges, hop))
  }, [layout, hop, setNodes, setEdges])

  useEffect(() => {
    onVisibleNodeIds?.(layout.nodes.map((n) => n.id))
  }, [layout.nodes, onVisibleNodeIds])

  const applyNodeSelection = useCallback(
    (nodeId: string | null) => {
      selectedNodeIdRef.current = nodeId
      setGlowActiveId(nodeId)
      setNodes((nds) => applyHopNodes(nds, nodeId, hopRef.current))
      onAnchorChangeRef.current?.(nodeId)
    },
    [setNodes],
  )

  const focusNodeDom = useCallback((nodeId: string) => {
    window.setTimeout(() => {
      const el = document.querySelector(
        `.react-flow__node[data-id="${CSS.escape(nodeId)}"]`,
      ) as HTMLElement | null
      if (!el) return
      // nodesFocusable is off; ensure the element can take focus for hop keys.
      if (!el.hasAttribute('tabindex')) el.tabIndex = -1
      el.focus({ preventScroll: true })
    }, 80)
  }, [])

  const focusCanvas = useCallback(() => {
    wrapRef.current?.focus({ preventScroll: true })
    const anchor = selectedNodeIdRef.current
    if (anchor) focusNodeDom(anchor)
  }, [focusNodeDom])

  const selectNodeOnly = useCallback(
    (nodeId: string) => {
      clearHop()
      applyNodeSelection(nodeId)
      wrapRef.current?.focus({ preventScroll: true })
      focusNodeDom(nodeId)
    },
    [applyNodeSelection, clearHop, focusNodeDom],
  )
  selectNodeOnlyRef.current = selectNodeOnly

  const fitToNodeIds = useCallback(
    (ids: string[], padding: number, maxZoom: number) => {
      if (ids.length === 0) return
      void fitView({
        nodes: ids.map((id) => ({ id })),
        padding,
        duration: 350,
        maxZoom,
        minZoom: 0.15,
      })
    },
    [fitView],
  )

  const enterPreview = useCallback(
    (next: HopState, index: number) => {
      if (index < 0 || index >= next.targets.length) return
      const targetId = next.targets[index]
      const preview: HopState = {
        ...next,
        index,
        phase: 'preview',
      }
      setHopState(preview)
      startBlink(targetId, 2000)
      fitToNodeIds([targetId], 0.4, 1.2)
    },
    [fitToNodeIds, setHopState, startBlink],
  )

  const beginHop = useCallback(
    (direction: HopDirection) => {
      const anchorId = selectedNodeIdRef.current
      if (!anchorId) return
      const targets = collectHopTargets(
        getNodes(),
        getEdges(),
        anchorId,
        direction,
      )
      if (targets.length === 0) return

      clearDigitBuffer()
      if (targets.length === 1) {
        const next: HopState = {
          direction,
          anchorId,
          targets,
          index: 0,
          phase: 'preview',
        }
        setHopState(next)
        startBlink(targets[0], 2000)
        fitToNodeIds([targets[0]], 0.4, 1.2)
        return
      }

      const next: HopState = {
        direction,
        anchorId,
        targets,
        index: null,
        phase: 'hop',
      }
      setHopState(next)
      fitToNodeIds([anchorId, ...targets], 0.35, 1.0)
    },
    [clearDigitBuffer, fitToNodeIds, getEdges, getNodes, setHopState, startBlink],
  )

  const commitHop = useCallback(() => {
    const current = hopRef.current
    if (!current || current.phase !== 'preview' || current.index == null) return
    const targetId = current.targets[current.index]
    if (!targetId) return
    clearHop()
    selectedNodeIdRef.current = targetId
    setGlowActiveId(targetId)
    setNodes((nds) => applyHopNodes(nds, targetId, null))
    setEdges((eds) => applyHopEdges(eds, null))
    onAnchorChangeRef.current?.(targetId)
    fitToNodeIds([targetId], 0.45, 1.15)
    focusNodeDom(targetId)
  }, [clearHop, fitToNodeIds, focusNodeDom, setEdges, setNodes])

  const commitDigitBuffer = useCallback(() => {
    const raw = digitBufferRef.current
    clearDigitBuffer()
    const current = hopRef.current
    if (!raw || !current) return
    const index = Number.parseInt(raw, 10)
    if (!Number.isFinite(index) || index < 0 || index >= current.targets.length) {
      return
    }
    enterPreview(current, index)
  }, [clearDigitBuffer, enterPreview])

  const appendDigit = useCallback(
    (digit: string) => {
      const current = hopRef.current
      if (!current || current.targets.length === 0) return
      digitBufferRef.current += digit
      const raw = digitBufferRef.current
      const index = Number.parseInt(raw, 10)
      const n = current.targets.length
      const maxIndex = n - 1
      const maxDigits = String(maxIndex).length
      const canBePrefix = [...Array(n).keys()].some(
        (i) => String(i).startsWith(raw) && String(i).length > raw.length,
      )
      const exactValid = Number.isFinite(index) && index >= 0 && index < n

      if (digitTimerRef.current != null) {
        window.clearTimeout(digitTimerRef.current)
        digitTimerRef.current = null
      }

      // Commit immediately when the buffer cannot grow into another valid index.
      if (exactValid && (!canBePrefix || raw.length >= maxDigits)) {
        commitDigitBuffer()
        return
      }

      // Invalid so far and cannot become valid — drop buffer.
      if (!exactValid && !canBePrefix) {
        clearDigitBuffer()
        return
      }

      digitTimerRef.current = window.setTimeout(() => {
        digitTimerRef.current = null
        commitDigitBuffer()
      }, 500)
    },
    [clearDigitBuffer, commitDigitBuffer],
  )

  const moveHopIndex = useCallback(
    (delta: number) => {
      const current = hopRef.current
      if (!current || current.targets.length === 0) return
      const n = current.targets.length
      let nextIndex: number
      if (current.index == null) {
        nextIndex = delta > 0 ? 0 : n - 1
      } else {
        nextIndex = (current.index + delta + n) % n
      }
      enterPreview(current, nextIndex)
    },
    [enterPreview],
  )

  const locateNode = useCallback(
    (nodeId: string, options?: { focus?: boolean }) => {
      const node = findNodeByPath(getNodes(), nodeId)
      if (!node) return false
      const focus = options?.focus !== false
      clearHop()
      applyNodeSelection(node.id)
      startBlink(node.id)
      fitToNodeIds([node.id], 0.45, 1.15)
      if (focus) {
        // Leave Explorer focus so hop h/l keys are not ignored.
        wrapRef.current?.focus({ preventScroll: true })
        focusNodeDom(node.id)
      }
      return true
    },
    [
      applyNodeSelection,
      clearHop,
      fitToNodeIds,
      focusNodeDom,
      getNodes,
      startBlink,
    ],
  )

  useImperativeHandle(
    handleRef,
    () => ({
      locateNode,
      focusCanvas,
      getAnchorId: () => selectedNodeIdRef.current,
      isHopActive: () => hopRef.current != null,
    }),
    [focusCanvas, locateNode],
  )

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (shouldIgnoreHopHotkey(event.target)) return
      if (event.ctrlKey || event.metaKey || event.altKey) return

      const current = hopRef.current

      if (event.key === 'Escape') {
        if (!current) return
        event.preventDefault()
        event.stopPropagation()
        clearDigitBuffer()
        if (current.phase === 'preview' && current.targets.length > 1) {
          const group: HopState = {
            ...current,
            index: null,
            phase: 'hop',
          }
          setHopState(group)
          fitToNodeIds([current.anchorId, ...current.targets], 0.35, 1.0)
          return
        }
        clearHop()
        fitToNodeIds([current.anchorId], 0.45, 1.15)
        focusNodeDom(current.anchorId)
        return
      }

      if (current && event.key === 'Enter' && digitBufferRef.current) {
        event.preventDefault()
        commitDigitBuffer()
        return
      }

      if (event.key === 'Enter') {
        const openId =
          current?.phase === 'preview' && current.index != null
            ? current.targets[current.index]
            : selectedNodeIdRef.current
        if (!openId) return
        event.preventDefault()
        event.stopPropagation()
        onNodeOpen?.(openId)
        return
      }

      if (current) {
        let digit: string | null = null
        if (/^Digit[0-9]$/.test(event.code)) {
          digit = event.code.slice(5)
        } else if (/^Numpad[0-9]$/.test(event.code)) {
          digit = event.code.slice(6)
        } else if (/^[0-9]$/.test(event.key)) {
          digit = event.key
        }
        if (digit != null) {
          event.preventDefault()
          event.stopPropagation()
          appendDigit(digit)
          return
        }
      }

      if (current && (event.code === 'KeyJ' || event.code === 'ArrowDown')) {
        event.preventDefault()
        moveHopIndex(1)
        return
      }
      if (current && (event.code === 'KeyK' || event.code === 'ArrowUp')) {
        event.preventDefault()
        moveHopIndex(-1)
        return
      }

      // Physical H/J/K/L (event.code) — works on any keyboard layout.
      // Shift+H/L reserved for file-viewer history (App); do not start hop.
      if (event.shiftKey) return

      if (event.code === 'KeyL') {
        event.preventDefault()
        if (
          current?.direction === 'forward' &&
          current.phase === 'preview' &&
          current.index != null
        ) {
          commitHop()
          return
        }
        if (current?.direction === 'forward' && current.phase === 'hop') {
          return
        }
        if (current && current.direction !== 'forward') {
          clearHop()
        }
        beginHop('forward')
        return
      }

      if (event.code === 'KeyH') {
        event.preventDefault()
        if (
          current?.direction === 'backward' &&
          current.phase === 'preview' &&
          current.index != null
        ) {
          commitHop()
          return
        }
        if (current?.direction === 'backward' && current.phase === 'hop') {
          return
        }
        if (current && current.direction !== 'backward') {
          clearHop()
        }
        beginHop('backward')
      }
    }

    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [
    appendDigit,
    beginHop,
    clearDigitBuffer,
    clearHop,
    commitDigitBuffer,
    commitHop,
    fitToNodeIds,
    focusNodeDom,
    moveHopIndex,
    onNodeOpen,
  ])

  return (
    <div
      ref={wrapRef}
      className="graph-wrap"
      style={{ width: '100%', height: '100%' }}
      tabIndex={-1}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        nodesConnectable={false}
        nodesFocusable={false}
        fitView
        minZoom={0.05}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(event, node) => {
          if (event.ctrlKey || event.metaKey) {
            selectNodeOnly(node.id)
            return
          }
          clearHop()
          applyNodeSelection(node.id)
          onNodeOpen?.(node.id)
        }}
        onPaneClick={() => {
          clearHop()
          applyNodeSelection(null)
        }}
      >
        <Background gap={18} />
        <PathGlowOverlay
          enabled={pathGlow}
          nodes={nodes}
          activeId={glowActiveId}
        />
        <Controls showInteractive />
        <MiniMap pannable zoomable />
        <NodeSearchPanel
          displayPrefix={graph.displayPrefix || ''}
          locateNode={locateNode}
          reviewEnabled={reviewEnabled}
          reviewOpen={reviewOpen}
          onReviewToggle={onReviewToggle}
          noteSummaries={noteSummaries}
          selectedNoteId={selectedNoteId}
          onNoteChange={onNoteChange}
          notesGuideEnabled={notesGuideEnabled}
          notesGuideOpen={notesGuideOpen}
          onNotesGuideToggle={onNotesGuideToggle}
        />
      </ReactFlow>
    </div>
  )
}
