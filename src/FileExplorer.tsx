import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { Tree, type NodeRendererProps, type TreeApi } from 'react-arborist'
import { pathsToTree, type FileTreeNode } from './fileTree'

type FileExplorerProps = {
  open: boolean
  paths: string[]
  onClose: () => void
  onOpen: (path: string) => void
  onLocate: (path: string) => void
}

export type FileExplorerHandle = {
  focusTree: () => void
  /** Expand parents, select, and scroll to a file path (VS Code–like reveal). */
  revealPath: (path: string, options?: { focus?: boolean }) => void
}

function focusTreeContainer(tree: TreeApi<FileTreeNode> | null) {
  if (!tree) return
  const container = tree.listEl.current?.closest(
    '[role="tree"]',
  ) as HTMLElement | null
  container?.focus()
}

function focusTreeApi(tree: TreeApi<FileTreeNode> | null) {
  if (!tree) return
  focusTreeContainer(tree)
  const target = tree.focusedNode ?? tree.firstNode
  if (target) tree.focus(target)
}

function revealPathInTree(
  tree: TreeApi<FileTreeNode> | null,
  path: string,
  options?: { focus?: boolean },
): boolean {
  if (!tree || !path) return false
  const node = tree.get(path)
  if (!node) return false
  const focus = options?.focus !== false
  tree.openParents(path)
  window.setTimeout(() => {
    const live = tree.get(path)
    if (!live) return
    tree.select(path)
    if (focus) {
      tree.focus(path, { scroll: true })
      focusTreeContainer(tree)
    }
    void tree.scrollTo(path, 'center')
  }, 0)
  return true
}

function ExplorerNode({
  node,
  style,
  dragHandle,
  onOpen,
  onLocate,
}: NodeRendererProps<FileTreeNode> & {
  onOpen: (path: string) => void
  onLocate: (path: string) => void
}) {
  const data = node.data
  const isFolder = !data.isFile

  return (
    <div
      ref={dragHandle}
      style={style}
      className={`explorer-row${node.isSelected ? ' selected' : ''}${node.state.isFocused ? ' focused' : ''}`}
      title={
        isFolder
          ? 'Click or l/→ to expand, h/← to collapse. hjkl / arrows to move.'
          : 'Click to open. Ctrl+click or Ctrl+Enter focuses the node on the graph for hop (h/l); Esc returns here. hjkl / arrows to move.'
      }
      onClick={(event) => {
        event.stopPropagation()
        if (isFolder) {
          node.toggle()
          return
        }
        if (event.ctrlKey || event.metaKey) {
          onLocate(data.id)
          return
        }
        onOpen(data.id)
      }}
    >
      <span className="explorer-twist" aria-hidden>
        {isFolder ? (node.isOpen ? '▾' : '▸') : '·'}
      </span>
      <span className="explorer-label">{data.name}</span>
    </div>
  )
}

function moveDown(tree: TreeApi<FileTreeNode>) {
  const next = tree.nextNode
  if (next) tree.focus(next)
}

function moveUp(tree: TreeApi<FileTreeNode>) {
  const prev = tree.prevNode
  if (prev) tree.focus(prev)
}

/** nvim-style h / ArrowLeft: collapse open folder, else focus parent */
function moveLeft(tree: TreeApi<FileTreeNode>) {
  const node = tree.focusedNode
  if (!node || node.isRoot) return
  if (node.isInternal && node.isOpen) {
    tree.close(node.id)
    return
  }
  if (node.parent && !node.parent.isRoot) {
    tree.focus(node.parent)
  }
}

/** nvim-style l / ArrowRight: expand folder or move into next */
function moveRight(tree: TreeApi<FileTreeNode>) {
  const node = tree.focusedNode
  if (!node) return
  if (node.isInternal && node.isOpen) {
    if (tree.nextNode) tree.focus(tree.nextNode)
    return
  }
  if (node.isInternal) {
    tree.open(node.id)
  }
}

/**
 * Right-side folder tree of visible canvas nodes (react-arborist).
 * Folders start collapsed. Keyboard: hjkl, arrows, gg, G (nvim-like).
 */
export const FileExplorer = forwardRef<FileExplorerHandle, FileExplorerProps>(
  function FileExplorer({ open, paths, onClose, onOpen, onLocate }, ref) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const treeRef = useRef<TreeApi<FileTreeNode> | null>(null)
  const pendingGRef = useRef(false)
  const pendingGTimerRef = useRef<number | null>(null)
  const pendingRevealRef = useRef<string | null>(null)
  const wasOpenRef = useRef(false)
  const [size, setSize] = useState({ width: 260, height: 400 })
  const data = useMemo(() => pathsToTree(paths), [paths])

  useImperativeHandle(
    ref,
    () => ({
      focusTree: () => focusTreeApi(treeRef.current),
      revealPath: (path: string, options?: { focus?: boolean }) => {
        pendingRevealRef.current = path
        if (!revealPathInTree(treeRef.current, path, options)) {
          // Tree not ready or path not visible yet — retry after layout.
          window.setTimeout(() => {
            if (pendingRevealRef.current !== path) return
            if (revealPathInTree(treeRef.current, path, options)) {
              pendingRevealRef.current = null
            }
          }, 50)
        } else {
          pendingRevealRef.current = null
        }
      },
    }),
    [],
  )

  useEffect(() => {
    const el = bodyRef.current
    if (!el || !open) return
    const update = () => {
      const rect = el.getBoundingClientRect()
      setSize({
        width: Math.max(160, Math.floor(rect.width)),
        height: Math.max(120, Math.floor(rect.height)),
      })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [open])

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false
      pendingGRef.current = false
      if (pendingGTimerRef.current != null) {
        window.clearTimeout(pendingGTimerRef.current)
        pendingGTimerRef.current = null
      }
      return
    }
    if (paths.length === 0) return

    const pending = pendingRevealRef.current
    if (pending) {
      const timer = window.setTimeout(() => {
        if (revealPathInTree(treeRef.current, pending)) {
          pendingRevealRef.current = null
        }
      }, 0)
      wasOpenRef.current = true
      return () => window.clearTimeout(timer)
    }

    if (wasOpenRef.current) return
    wasOpenRef.current = true

    const timer = window.setTimeout(() => {
      focusTreeApi(treeRef.current)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [open, paths.length, data])

  function clearPendingG() {
    pendingGRef.current = false
    if (pendingGTimerRef.current != null) {
      window.clearTimeout(pendingGTimerRef.current)
      pendingGTimerRef.current = null
    }
  }

  function onNvimKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!open) return
    const tree = treeRef.current
    if (!tree || tree.isEditing) return

    const code = event.code

    // Ctrl/Cmd+Enter on a file → locate on graph (same as search / Ctrl+click)
    if (
      code === 'Enter' &&
      (event.ctrlKey || event.metaKey) &&
      !event.altKey
    ) {
      const node = tree.focusedNode
      if (!node || !node.data.isFile) return
      event.preventDefault()
      event.stopPropagation()
      onLocate(node.data.id)
      return
    }

    if (event.ctrlKey || event.metaKey || event.altKey) return

    // Use event.code so hjkl/gg work on non-Latin keyboard layouts.
    if (code === 'KeyG' && !event.shiftKey) {
      event.preventDefault()
      event.stopPropagation()
      if (pendingGRef.current) {
        clearPendingG()
        if (tree.firstNode) tree.focus(tree.firstNode)
        return
      }
      pendingGRef.current = true
      pendingGTimerRef.current = window.setTimeout(() => {
        pendingGRef.current = false
        pendingGTimerRef.current = null
      }, 500)
      return
    }

    if (code === 'KeyG' && event.shiftKey) {
      event.preventDefault()
      event.stopPropagation()
      clearPendingG()
      if (tree.lastNode) tree.focus(tree.lastNode)
      return
    }

    if (pendingGRef.current && code !== 'KeyG') {
      clearPendingG()
    }

    if (code === 'KeyJ') {
      event.preventDefault()
      event.stopPropagation()
      moveDown(tree)
      return
    }
    if (code === 'KeyK') {
      event.preventDefault()
      event.stopPropagation()
      moveUp(tree)
      return
    }
    if (code === 'KeyH') {
      event.preventDefault()
      event.stopPropagation()
      moveLeft(tree)
      return
    }
    if (code === 'KeyL') {
      event.preventDefault()
      event.stopPropagation()
      moveRight(tree)
      return
    }

    // Arrows (layout-independent)
    if (code === 'ArrowDown') {
      event.preventDefault()
      event.stopPropagation()
      moveDown(tree)
      return
    }
    if (code === 'ArrowUp') {
      event.preventDefault()
      event.stopPropagation()
      moveUp(tree)
      return
    }
    if (code === 'ArrowLeft') {
      event.preventDefault()
      event.stopPropagation()
      moveLeft(tree)
      return
    }
    if (code === 'ArrowRight') {
      event.preventDefault()
      event.stopPropagation()
      moveRight(tree)
      return
    }

    if (code === 'Home') {
      event.preventDefault()
      event.stopPropagation()
      if (tree.firstNode) tree.focus(tree.firstNode)
      return
    }
    if (code === 'End') {
      event.preventDefault()
      event.stopPropagation()
      if (tree.lastNode) tree.focus(tree.lastNode)
      return
    }

    if (code === 'Enter' || code === 'Space') {
      const node = tree.focusedNode
      if (!node) return
      event.preventDefault()
      event.stopPropagation()
      if (!node.data.isFile) {
        node.toggle()
        return
      }
      if (code === 'Enter') onOpen(node.data.id)
      else node.select()
    }
  }

  if (!open) return null

  return (
    <aside
      className="explorer-panel"
      aria-label="File explorer"
      onKeyDownCapture={onNvimKeyDown}
    >
      <header className="explorer-header">
        <h2>Explorer</h2>
        <button
          type="button"
          className="toolbar-btn"
          title="Close explorer (Ctrl+Shift+E)"
          onClick={onClose}
        >
          Close
        </button>
      </header>
      <div className="explorer-meta">
        {paths.length} file{paths.length === 1 ? '' : 's'} on canvas · hjkl / arrows
      </div>
      <div ref={bodyRef} className="explorer-body">
        {paths.length === 0 ? (
          <div className="explorer-empty">No visible files for current filters.</div>
        ) : (
          <Tree
            ref={treeRef}
            data={data}
            width={size.width}
            height={size.height}
            indent={14}
            rowHeight={26}
            openByDefault={false}
            disableDrag
            disableDrop
            disableEdit
            disableMultiSelection
            className="explorer-tree"
          >
            {(props) => (
              <ExplorerNode
                {...props}
                onOpen={onOpen}
                onLocate={onLocate}
              />
            )}
          </Tree>
        )}
      </div>
    </aside>
  )
  },
)
