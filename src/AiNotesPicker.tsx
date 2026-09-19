import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import type { NoteSummary } from './types'

type AiNotesPickerProps = {
  notes: NoteSummary[]
  selectedId: string
  onChange: (id: string) => void
}

/**
 * Searchable single-select for AI notes (by label / id).
 */
export function AiNotesPicker({
  notes,
  selectedId,
  onChange,
}: AiNotesPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const searchId = useId()

  const selected = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const sorted = [...notes].sort((a, b) => a.label.localeCompare(b.label))
    if (!q) return sorted
    return sorted.filter(
      (n) =>
        n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q),
    )
  }, [notes, query])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      searchRef.current?.focus()
      searchRef.current?.select()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onDoc(event: MouseEvent) {
      const root = rootRef.current
      if (!root) return
      if (event.target instanceof Node && !root.contains(event.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  function onTriggerKey(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen(true)
    }
  }

  const summary = selected ? selected.label : 'AI notes…'

  return (
    <div className="ai-notes-picker" ref={rootRef}>
      <button
        type="button"
        className={`toolbar-btn ai-notes-picker-trigger${open ? ' open' : ''}${selected ? ' has-selection' : ''}`}
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        title="AI notes walkthrough (searchable). Shift+N toggles the guide when a note is selected."
        onClick={() => {
          setOpen((v) => !v)
          if (open) setQuery('')
        }}
        onKeyDown={onTriggerKey}
      >
        <span className="ai-notes-picker-summary">{summary}</span>
        <span className="ai-notes-picker-caret" aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <div className="ai-notes-picker-dropdown" id={listId}>
          <label className="sr-only" htmlFor={searchId}>
            Search AI notes
          </label>
          <input
            ref={searchRef}
            id={searchId}
            className="ai-notes-picker-search"
            type="search"
            value={query}
            placeholder="Search by label or id…"
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setQuery(event.target.value)}
          />
          <ul
            className="ai-notes-picker-list"
            role="listbox"
            aria-label="AI notes"
          >
            <li role="option" aria-selected={!selectedId}>
              <button
                type="button"
                className={`ai-notes-picker-option${!selectedId ? ' active' : ''}`}
                onClick={() => {
                  onChange('')
                  setOpen(false)
                  setQuery('')
                }}
              >
                None
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="ai-notes-picker-empty">No matches</li>
            ) : (
              filtered.map((entry) => {
                const active = entry.id === selectedId
                return (
                  <li
                    key={entry.id}
                    role="option"
                    aria-selected={active}
                  >
                    <button
                      type="button"
                      className={`ai-notes-picker-option${active ? ' active' : ''}`}
                      title={entry.id}
                      onClick={() => {
                        onChange(entry.id)
                        setOpen(false)
                        setQuery('')
                      }}
                    >
                      <span className="ai-notes-picker-label">
                        {entry.label}
                      </span>
                      <span className="ai-notes-picker-id">{entry.id}</span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
