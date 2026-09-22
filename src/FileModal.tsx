import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import Editor, { DiffEditor } from '@monaco-editor/react'
import type { editor as MonacoEditor } from 'monaco-editor'

import {
  buildOriginalContent,
  commentsForHunks,
  hunkHighlightRanges,
  modifiedHighlightRanges,
  notesForHunks,
} from './changeDiff'
import { resolveDefinition } from './goToDefinition'
import { ensureJsdocHoverProviders, setJsdocHoverContext } from './jsdocHover'
import { bindReadonlyVimKeys } from './monacoVimKeys'
import type { ChangeHunk, ChangeNote, FilePayload } from './types'

type CommentDisplayMode = 'summary' | 'inline' | 'both' | 'hide'

type FileModalProps = {
  open: boolean
  loading: boolean
  error: string | null
  file: FilePayload | null
  theme?: 'light' | 'dark'
  tags?: string[]
  tagColors?: Record<string, string>
  changeHunks?: ChangeHunk[]
  /** Paths this file imports (graph edge targets). */
  importTargets?: string[]
  /** Jump to this 1-based line after open / navigation. */
  jumpToLine?: number | null
  /** modal = overlay dialog; panel = docked split pane */
  variant?: 'modal' | 'panel'
  onClose: () => void
  onSplitChange?: (split: boolean) => void
  onExpandedChange?: (expanded: boolean) => void
  onJumpToLineConsumed?: () => void
  /** Open another file (and optional line) for gd. */
  onOpenDefinition?: (path: string, line: number) => void
}

function toVsCodeUri(fileUri: string): string | null {
  try {
    if (fileUri.startsWith('vscode://')) return fileUri
    if (!fileUri.startsWith('file:')) return null
    const url = new URL(fileUri)
    // Windows: file:///D:/path → /D:/path ; Unix: file:///home/... → /home/...
    let fsPath = decodeURIComponent(url.pathname)
    if (/^\/[A-Za-z]:\//.test(fsPath)) {
      fsPath = fsPath.slice(1)
    }
    return `vscode://file/${fsPath}`
  } catch {
    return null
  }
}

/**
 * Modal or split-pane Monaco preview of a scanned source file.
 * When agent change hunks are present, shows comments/notes and a DiffEditor.
 */
export function FileModal({
  open,
  loading,
  error,
  file,
  theme = 'light',
  tags = [],
  tagColors = {},
  changeHunks = [],
  importTargets = [],
  jumpToLine = null,
  variant = 'modal',
  onClose,
  onSplitChange,
  onExpandedChange,
  onJumpToLineConsumed,
  onOpenDefinition,
}: FileModalProps) {
  const titleId = useId()
  const decorationIds = useRef<string[]>([])
  const noteZoneIds = useRef<string[]>([])
  const vimCleanupRef = useRef<(() => void) | null>(null)
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null)
  const fileRef = useRef(file)
  const importTargetsRef = useRef(importTargets)
  const onOpenDefinitionRef = useRef(onOpenDefinition)
  fileRef.current = file
  importTargetsRef.current = importTargets
  onOpenDefinitionRef.current = onOpenDefinition
  const [expanded, setExpanded] = useState(false)
  const [commentDisplayMode, setCommentDisplayMode] =
    useState<CommentDisplayMode>('both')
  const [pathCopied, setPathCopied] = useState(false)
  const [gdStatus, setGdStatus] = useState<string | null>(null)
  const [diffView, setDiffView] = useState<'side-by-side' | 'current'>(
    'side-by-side',
  )

  useEffect(() => {
    if (!open || !file) {
      setJsdocHoverContext(null)
      return
    }
    setJsdocHoverContext({
      path: file.path,
      importTargets,
    })
    return () => setJsdocHoverContext(null)
  }, [open, file, importTargets])

  const isPanel = variant === 'panel'
  const pathLabel = file?.displayPath || file?.path || 'File'
  const copyPath = file?.path || file?.displayPath || ''

  const revealLine = useCallback((line: number) => {
    const ed = editorRef.current
    if (!ed || !Number.isFinite(line) || line < 1) return
    ed.setPosition({ lineNumber: line, column: 1 })
    ed.revealLineInCenter(line)
    ed.focus()
  }, [])

  const runGoToDefinition = useCallback(async () => {
    const ed = editorRef.current
    const current = fileRef.current
    if (!ed || !current) return
    const pos = ed.getPosition()
    if (!pos) return
    setGdStatus('Looking up…')
    try {
      const hit = await resolveDefinition({
        path: current.path,
        content: current.content,
        line: pos.lineNumber,
        column: pos.column,
        importTargets: importTargetsRef.current,
      })
      if (!hit) {
        setGdStatus('No definition found')
        window.setTimeout(() => setGdStatus(null), 1600)
        return
      }
      setGdStatus(null)
      if (hit.path === current.path) {
        revealLine(hit.line)
        return
      }
      onOpenDefinitionRef.current?.(hit.path, hit.line)
    } catch {
      setGdStatus('Definition lookup failed')
      window.setTimeout(() => setGdStatus(null), 1600)
    }
  }, [revealLine])

  useEffect(() => {
    onExpandedChange?.(expanded)
  }, [expanded, onExpandedChange])

  useEffect(() => {
    setExpanded(false)
  }, [variant])

  useEffect(() => {
    setDiffView('side-by-side')
    setCommentDisplayMode('both')
  }, [file?.path])

  useEffect(() => {
    if (!pathCopied) return
    const timer = window.setTimeout(() => setPathCopied(false), 1500)
    return () => window.clearTimeout(timer)
  }, [pathCopied])

  useEffect(() => {
    if (!open) {
      setGdStatus(null)
    }
  }, [open])

  useEffect(() => {
    if (!open || loading || error || !file) return
    if (jumpToLine == null || jumpToLine < 1) return
    const timer = window.setTimeout(() => {
      revealLine(jumpToLine)
      onJumpToLineConsumed?.()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [
    open,
    loading,
    error,
    file?.path,
    jumpToLine,
    revealLine,
    onJumpToLineConsumed,
  ])

  useEffect(() => {
    if (!open) {
      setExpanded(false)
      setCommentDisplayMode('both')
      setPathCopied(false)
      vimCleanupRef.current?.()
      vimCleanupRef.current = null
      editorRef.current = null
      noteZoneIds.current = []
      return
    }
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target?.isContentEditable
      ) {
        return
      }
      if (event.key === 'Escape') {
        if (expanded) {
          setExpanded(false)
        } else {
          onClose()
        }
        return
      }
      if (event.code === 'KeyZ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        // Don't steal Z when Monaco has focus (rare); still allow zoom from chrome.
        if (target?.closest('.monaco-editor')) return
        event.preventDefault()
        setExpanded((value) => !value)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      vimCleanupRef.current?.()
      vimCleanupRef.current = null
    }
  }, [open, onClose, expanded])

  const comment = useMemo(
    () => commentsForHunks(changeHunks),
    [changeHunks],
  )

  const lineNotes = useMemo(() => notesForHunks(changeHunks), [changeHunks])

  const original = useMemo(() => {
    if (!file || changeHunks.length === 0) return null
    return buildOriginalContent(file.content, changeHunks)
  }, [file, changeHunks])

  const hasSideBySideDiff = Boolean(file && original !== null)
  const showSideBySide =
    hasSideBySideDiff && diffView === 'side-by-side'
  const showDecorated = Boolean(
    file &&
      changeHunks.length > 0 &&
      (!hasSideBySideDiff || diffView === 'current'),
  )

  const showSummary =
    Boolean(comment) &&
    (commentDisplayMode === 'summary' || commentDisplayMode === 'both')
  const showInlineNotes =
    lineNotes.length > 0 &&
    (commentDisplayMode === 'inline' || commentDisplayMode === 'both')

  const inRangeNotes = useMemo(() => {
    if (!file || !showInlineNotes) return []
    const lineCount = countContentLines(file.content)
    return lineNotes.filter((n) => n.line >= 1 && n.line <= lineCount)
  }, [file, showInlineNotes, lineNotes])

  const decorationRanges = useMemo(() => {
    if (!file || !showDecorated) return []
    if (original != null) {
      return modifiedHighlightRanges(original, file.content)
    }
    return hunkHighlightRanges(changeHunks)
  }, [file, showDecorated, original, changeHunks])

  useEffect(() => {
    if (!open || loading || error || !file) return
    const timer = window.setTimeout(() => {
      editorRef.current?.focus()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [open, loading, error, file?.path, showSideBySide, diffView])

  useEffect(() => {
    const ed = editorRef.current
    if (!ed) return
    if (!showInlineNotes) {
      clearLineNoteZones(ed, noteZoneIds)
      return
    }
    applyLineNoteZones(ed, inRangeNotes, noteZoneIds)
  }, [showInlineNotes, showSideBySide, inRangeNotes, open, file?.path, diffView])

  const firstLine = decorationRanges.reduce(
    (min, r) => Math.min(min, r.from),
    changeHunks.reduce(
      (min, h) => Math.min(min, h.from),
      Number.POSITIVE_INFINITY,
    ),
  )

  if (!open) return null

  const vscodeUri = file?.fileUri ? toVsCodeUri(file.fileUri) : null
  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs'
  const editorHeight = isPanel || expanded ? '100%' : '70vh'
  const foldControlsEnabled = Boolean(file && !loading && !error)
  const pathTitle = pathCopied
    ? 'Copied'
    : copyPath
      ? `Click to copy path. Pass to an agent: /tag-tree-ai-subtree ${copyPath} — builds a direct dependency tree (ai_subtree_nodes).`
      : undefined

  async function copyFilePath() {
    if (!copyPath) return
    try {
      await navigator.clipboard.writeText(copyPath)
      setPathCopied(true)
    } catch {
      /* ignore */
    }
  }

  const header = (
    <header className="modal-header">
      <div className="modal-title-block">
        <h2 id={titleId}>
          <button
            type="button"
            className="modal-path-btn"
            onClick={() => void copyFilePath()}
            title={pathTitle}
            disabled={!copyPath}
          >
            {pathLabel}
          </button>
        </h2>
        {tags.length > 0 && (
          <div className="modal-tags" aria-label="Node tags">
            {tags.map((tag) => {
              const color = tagColors[tag]
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
        {file?.fileUri && (
          <div className="modal-uri" title={file.fileUri}>
            {file.fileUri}
          </div>
        )}
      </div>
      <div className="modal-actions">
        {vscodeUri && (
          <a className="modal-link" href={vscodeUri}>
            <span className="label-full">Open in VS Code</span>
            <span className="label-short">VS Code</span>
          </a>
        )}
        {changeHunks.length > 0 ? (
          <label className="change-select-label">
            <span className="select-label-text">Comments</span>
            <select
              className="toolbar-select"
              value={commentDisplayMode}
              onChange={(event) =>
                setCommentDisplayMode(event.target.value as CommentDisplayMode)
              }
              title="How to show file summary and line notes"
              aria-label="Comments display"
            >
              <option value="summary">Summary</option>
              <option value="inline">Inline</option>
              <option value="both">Both</option>
              <option value="hide">Hide</option>
            </select>
          </label>
        ) : null}
        {hasSideBySideDiff ? (
          <button
            type="button"
            className="toolbar-btn"
            aria-pressed={diffView === 'current'}
            onClick={() =>
              setDiffView((value) =>
                value === 'current' ? 'side-by-side' : 'current',
              )
            }
            title={
              diffView === 'current'
                ? 'Show side-by-side diff (original | current)'
                : 'Show current file only with changed lines highlighted'
            }
          >
            <span className="label-full">
              {diffView === 'current' ? 'Side-by-side' : 'Current only'}
            </span>
            <span className="label-short">
              {diffView === 'current' ? 'Diff' : 'Current'}
            </span>
          </button>
        ) : null}
        <button
          type="button"
          className="toolbar-btn toolbar-btn-icon"
          disabled={!foldControlsEnabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() =>
            void runEditorFoldCommand(editorRef.current, 'fold')
          }
          title="Fold one nesting level"
          aria-label="Fold one nesting level"
        >
          <span aria-hidden>⊟</span>
        </button>
        <button
          type="button"
          className="toolbar-btn toolbar-btn-icon"
          disabled={!foldControlsEnabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() =>
            void runEditorFoldCommand(editorRef.current, 'unfold')
          }
          title="Unfold one nesting level"
          aria-label="Unfold one nesting level"
        >
          <span aria-hidden>⊞</span>
        </button>
        <button
          type="button"
          className="toolbar-btn toolbar-btn-icon"
          disabled={!foldControlsEnabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() =>
            void runEditorFoldCommand(editorRef.current, 'foldAll')
          }
          title="Fold all (Ctrl+K Ctrl+0)"
          aria-label="Fold all (Ctrl+K Ctrl+0)"
        >
          <span aria-hidden>≡</span>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => setExpanded((value) => !value)}
          title={
            expanded
              ? 'Exit full screen (Z)'
              : 'Open full screen (Z)'
          }
        >
          {expanded ? 'Exit zoom' : 'Zoom'}
        </button>
        {onSplitChange ? (
          <button
            type="button"
            className="toolbar-btn"
            aria-pressed={isPanel}
            onClick={() => onSplitChange(!isPanel)}
            title={
              isPanel
                ? 'Exit split view — back to modal'
                : 'Split view — file left, graph right'
            }
          >
            Split
          </button>
        ) : null}
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </header>
  )

  const body = (
    <div className="modal-body">
      {loading && <div className="status-loading">Loading file…</div>}
      {error && <div className="status-error">{error}</div>}
      {!loading && !error && file && (
        <>
          {showSummary ? (
            <div className="change-comment">{comment}</div>
          ) : null}
          <div className="modal-editor-wrap">
            {showSideBySide ? (
              <DiffEditor
                height={editorHeight}
                language={file.language}
                original={original!}
                modified={file.content}
                theme={monacoTheme}
                options={{
                  readOnly: true,
                  renderSideBySide: true,
                  minimap: { enabled: false },
                  fontSize: 13,
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  automaticLayout: true,
                  originalEditable: false,
                }}
                onMount={(editor, monaco) => {
                  ensureJsdocHoverProviders(monaco)
                  vimCleanupRef.current?.()
                  const modified = editor.getModifiedEditor()
                  editorRef.current = modified
                  vimCleanupRef.current = bindReadonlyVimKeys(modified, monaco, {
                    onGoToDefinition: () => {
                      void runGoToDefinition()
                    },
                  })
                  modified.focus()
                  if (Number.isFinite(firstLine)) {
                    modified.revealLineInCenter(firstLine)
                  }
                  if (showInlineNotes) {
                    applyLineNoteZones(modified, inRangeNotes, noteZoneIds)
                  } else {
                    clearLineNoteZones(modified, noteZoneIds)
                  }
                }}
              />
            ) : (
              <Editor
                key={`current-${diffView}-${file.path}`}
                height={editorHeight}
                language={file.language}
                value={file.content}
                theme={monacoTheme}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 13,
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  automaticLayout: true,
                }}
                onMount={(ed, monaco) => {
                  ensureJsdocHoverProviders(monaco)
                  vimCleanupRef.current?.()
                  editorRef.current = ed
                  vimCleanupRef.current = bindReadonlyVimKeys(ed, monaco, {
                    onGoToDefinition: () => {
                      void runGoToDefinition()
                    },
                  })
                  ed.focus()
                  if (
                    showDecorated &&
                    decorationRanges.length > 0 &&
                    Number.isFinite(firstLine)
                  ) {
                    ed.revealLineInCenter(firstLine)
                    const ranges = decorationRanges.map((r) => ({
                      range: new monaco.Range(r.from, 1, r.to, 1),
                      options: {
                        isWholeLine: true,
                        className: 'change-line-highlight',
                        marginClassName: 'change-line-margin',
                      },
                    }))
                    decorationIds.current = ed.deltaDecorations(
                      decorationIds.current,
                      ranges,
                    )
                  } else {
                    decorationIds.current = ed.deltaDecorations(
                      decorationIds.current,
                      [],
                    )
                  }
                  if (showInlineNotes) {
                    applyLineNoteZones(ed, inRangeNotes, noteZoneIds)
                  } else {
                    clearLineNoteZones(ed, noteZoneIds)
                  }
                }}
              />
            )}
          </div>
          {gdStatus ? <div className="gd-status">{gdStatus}</div> : null}
        </>
      )}
    </div>
  )

  if (isPanel) {
    return (
      <div
        className="file-panel"
        role="region"
        aria-labelledby={titleId}
      >
        {header}
        {body}
      </div>
    )
  }

  return (
    <div
      className={`modal-backdrop${expanded ? ' modal-backdrop-expanded' : ''}`}
      role="presentation"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        if (expanded) {
          setExpanded(false)
        } else {
          onClose()
        }
      }}
    >
      <div
        className={`modal-panel${expanded ? ' modal-panel-expanded' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        {header}
        {body}
      </div>
    </div>
  )
}

// HELPERS

async function runEditorFoldCommand(
  ed: MonacoEditor.IStandaloneCodeEditor | null,
  command: 'fold' | 'unfold' | 'foldAll',
) {
  if (!ed || !ed.getModel()) return
  ed.focus()

  if (command === 'foldAll') {
    await ed.getAction('editor.foldAll')?.run()
    return
  }

  const controller = ed.getContribution(
    'editor.contrib.folding',
  ) as FoldingControllerApi | null
  const modelPromise = controller?.getFoldingModel()
  if (!modelPromise) return
  const foldingModel = await modelPromise
  if (!foldingModel) return

  const { regions } = foldingModel
  if (!regions || regions.length === 0) return

  // Only regions not hidden under a collapsed parent are visible / actionable.
  const visibleIndexes: number[] = []
  for (let i = 0; i < regions.length; i++) {
    if (!hasCollapsedAncestor(regions, i)) visibleIndexes.push(i)
  }
  if (visibleIndexes.length === 0) return

  if (command === 'fold') {
    let maxOpenLevel = 0
    const openAtMax: number[] = []
    for (const i of visibleIndexes) {
      if (regions.isCollapsed(i)) continue
      const level = nestingLevel(regions, i)
      if (level > maxOpenLevel) {
        maxOpenLevel = level
        openAtMax.length = 0
        openAtMax.push(i)
      } else if (level === maxOpenLevel) {
        openAtMax.push(i)
      }
    }
    if (openAtMax.length === 0) return
    foldingModel.toggleCollapseState(
      openAtMax.map((i) => regions.toRegion(i)),
    )
    return
  }

  let maxCollapsedLevel = 0
  const collapsedAtMax: number[] = []
  for (const i of visibleIndexes) {
    if (!regions.isCollapsed(i)) continue
    const level = nestingLevel(regions, i)
    if (level > maxCollapsedLevel) {
      maxCollapsedLevel = level
      collapsedAtMax.length = 0
      collapsedAtMax.push(i)
    } else if (level === maxCollapsedLevel) {
      collapsedAtMax.push(i)
    }
  }
  if (collapsedAtMax.length === 0) return
  foldingModel.toggleCollapseState(
    collapsedAtMax.map((i) => regions.toRegion(i)),
  )
}

function hasCollapsedAncestor(
  regions: FoldingRegionsApi,
  index: number,
): boolean {
  let parent = regions.getParentIndex(index)
  while (parent !== -1) {
    if (regions.isCollapsed(parent)) return true
    parent = regions.getParentIndex(parent)
  }
  return false
}

function nestingLevel(regions: FoldingRegionsApi, index: number): number {
  let level = 1
  let parent = regions.getParentIndex(index)
  while (parent !== -1) {
    level += 1
    parent = regions.getParentIndex(parent)
  }
  return level
}

function countContentLines(text: string): number {
  if (!text) return 0
  const endsWithNewline = text.endsWith('\n')
  const lines = text.split('\n')
  if (endsWithNewline && lines[lines.length - 1] === '') {
    lines.pop()
  }
  return lines.length
}

function clearLineNoteZones(
  ed: MonacoEditor.IStandaloneCodeEditor,
  zoneIds: { current: string[] },
) {
  if (zoneIds.current.length === 0) return
  ed.changeViewZones((accessor) => {
    for (const id of zoneIds.current) {
      accessor.removeZone(id)
    }
  })
  zoneIds.current = []
}

function applyLineNoteZones(
  ed: MonacoEditor.IStandaloneCodeEditor,
  notes: ChangeNote[],
  zoneIds: { current: string[] },
) {
  clearLineNoteZones(ed, zoneIds)
  if (notes.length === 0) return

  const byLine = new Map<number, string[]>()
  for (const note of notes) {
    const list = byLine.get(note.line) ?? []
    list.push(note.text)
    byLine.set(note.line, list)
  }

  ed.changeViewZones((accessor) => {
    for (const [line, texts] of byLine) {
      const domNode = document.createElement('div')
      domNode.className = 'change-line-note-zone'
      domNode.textContent = texts.join('\n')
      const id = accessor.addZone({
        afterLineNumber: line,
        heightInPx: Math.max(28, 18 * texts.length + 12),
        domNode,
      })
      zoneIds.current.push(id)
    }
  })
}

// TYPES

type FoldRegion = {
  isCollapsed: boolean
}

type FoldingRegionsApi = {
  length: number
  isCollapsed: (index: number) => boolean
  getParentIndex: (index: number) => number
  toRegion: (index: number) => FoldRegion
}

type FoldingModelApi = {
  regions: FoldingRegionsApi
  toggleCollapseState: (regions: FoldRegion[]) => void
}

type FoldingControllerApi = {
  getFoldingModel: () => Promise<FoldingModelApi | null> | null
}
