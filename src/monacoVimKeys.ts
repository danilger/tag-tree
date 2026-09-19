import type { editor as MonacoEditorNS } from 'monaco-editor'

type Monaco = typeof import('monaco-editor')
type CodeEditor = MonacoEditorNS.IStandaloneCodeEditor

export type VimKeyHandlers = {
  onGoToDefinition?: () => void
}

function yankRange(
  ed: CodeEditor,
  range: {
    startLineNumber: number
    startColumn: number
    endLineNumber: number
    endColumn: number
  },
): void {
  const model = ed.getModel()
  if (!model) return
  const text = model.getValueInRange(range)
  void navigator.clipboard.writeText(text)
}

function yankLine(ed: CodeEditor): void {
  const model = ed.getModel()
  const pos = ed.getPosition()
  if (!model || !pos) return
  const line = model.getLineContent(pos.lineNumber)
  void navigator.clipboard.writeText(line)
}

/**
 * Readonly vim-like keys: hjkl, w/b, 0/$, gg/G, gd, y/yy/Y.
 * Also Ctrl/⌘+left-click → go to definition (same callback as gd).
 * Uses KeyCode so it works on non-Latin layouts. No insert mode.
 */
export function bindReadonlyVimKeys(
  ed: CodeEditor,
  monaco: Monaco,
  handlers: VimKeyHandlers = {},
): () => void {
  let pendingY = false
  let pendingG = false
  let yTimer: number | null = null
  let gTimer: number | null = null

  const clearY = () => {
    pendingY = false
    if (yTimer != null) {
      window.clearTimeout(yTimer)
      yTimer = null
    }
  }
  const clearG = () => {
    pendingG = false
    if (gTimer != null) {
      window.clearTimeout(gTimer)
      gTimer = null
    }
  }

  const mouseDisposable = ed.onMouseDown((e) => {
    if (!handlers.onGoToDefinition) return
    if (!e.event.leftButton) return
    if (!e.event.ctrlKey && !e.event.metaKey) return
    const pos = e.target.position
    if (!pos) return
    e.event.preventDefault()
    e.event.stopPropagation()
    clearY()
    clearG()
    ed.setPosition(pos)
    handlers.onGoToDefinition()
  })

  const disposable = ed.onKeyDown((e) => {
    if (e.browserEvent.ctrlKey || e.browserEvent.metaKey || e.browserEvent.altKey) {
      return
    }

    const { KeyCode } = monaco
    const shift = e.browserEvent.shiftKey

    if (e.keyCode === KeyCode.KeyH) {
      if (shift) return
      e.preventDefault()
      e.stopPropagation()
      clearY()
      clearG()
      ed.trigger('vim', 'cursorLeft', null)
      return
    }
    if (e.keyCode === KeyCode.KeyJ) {
      e.preventDefault()
      e.stopPropagation()
      clearY()
      clearG()
      ed.trigger('vim', 'cursorDown', null)
      return
    }
    if (e.keyCode === KeyCode.KeyK) {
      e.preventDefault()
      e.stopPropagation()
      clearY()
      clearG()
      ed.trigger('vim', 'cursorUp', null)
      return
    }
    if (e.keyCode === KeyCode.KeyL) {
      if (shift) return
      e.preventDefault()
      e.stopPropagation()
      clearY()
      clearG()
      ed.trigger('vim', 'cursorRight', null)
      return
    }

    if (e.keyCode === KeyCode.KeyW && !shift) {
      e.preventDefault()
      e.stopPropagation()
      clearY()
      clearG()
      ed.trigger('vim', 'cursorWordStartRight', null)
      return
    }
    if (e.keyCode === KeyCode.KeyB && !shift) {
      e.preventDefault()
      e.stopPropagation()
      clearY()
      clearG()
      ed.trigger('vim', 'cursorWordStartLeft', null)
      return
    }

    if (e.keyCode === KeyCode.Digit0 && !shift) {
      e.preventDefault()
      e.stopPropagation()
      clearY()
      clearG()
      const pos = ed.getPosition()
      if (!pos) return
      ed.setPosition({ lineNumber: pos.lineNumber, column: 1 })
      ed.revealPositionInCenterIfOutsideViewport({
        lineNumber: pos.lineNumber,
        column: 1,
      })
      return
    }

    const isDollar =
      e.browserEvent.key === '$' || (e.keyCode === KeyCode.Digit4 && shift)
    if (isDollar) {
      e.preventDefault()
      e.stopPropagation()
      clearY()
      clearG()
      const model = ed.getModel()
      const pos = ed.getPosition()
      if (!model || !pos) return
      const column = model.getLineMaxColumn(pos.lineNumber)
      ed.setPosition({ lineNumber: pos.lineNumber, column })
      ed.revealPositionInCenterIfOutsideViewport({
        lineNumber: pos.lineNumber,
        column,
      })
      return
    }

    // gd — go to definition (after pending g)
    if (e.keyCode === KeyCode.KeyD && pendingG && !shift) {
      e.preventDefault()
      e.stopPropagation()
      clearG()
      clearY()
      handlers.onGoToDefinition?.()
      return
    }

    if (e.keyCode === KeyCode.KeyG) {
      e.preventDefault()
      e.stopPropagation()
      clearY()
      if (shift) {
        clearG()
        const model = ed.getModel()
        if (!model) return
        const line = model.getLineCount()
        ed.setPosition({ lineNumber: line, column: 1 })
        ed.revealLineInCenter(line)
        return
      }
      if (pendingG) {
        clearG()
        ed.setPosition({ lineNumber: 1, column: 1 })
        ed.revealLine(1)
        return
      }
      pendingG = true
      gTimer = window.setTimeout(() => {
        pendingG = false
        gTimer = null
      }, 500)
      return
    }

    if (e.keyCode === KeyCode.KeyY) {
      e.preventDefault()
      e.stopPropagation()
      clearG()
      const sel = ed.getSelection()
      if (sel && !sel.isEmpty()) {
        clearY()
        yankRange(ed, sel)
        return
      }
      if (shift || pendingY) {
        clearY()
        yankLine(ed)
        return
      }
      pendingY = true
      yTimer = window.setTimeout(() => {
        pendingY = false
        yTimer = null
      }, 500)
    }
  })

  return () => {
    clearY()
    clearG()
    disposable.dispose()
    mouseDisposable.dispose()
  }
}
