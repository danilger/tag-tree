import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import type { ConfigTag } from './types'

type TagFilterProps = {
  tags: ConfigTag[]
  selected: string[]
  onChange: (next: string[]) => void
}

/**
 * Searchable multi-select of config tags + selected chip strip.
 */
export function TagFilter({ tags, selected, onChange }: TagFilterProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const searchId = useId()

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
    function onDocPointer(event: MouseEvent) {
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
    document.addEventListener('mousedown', onDocPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const sorted = useMemo(() => {
    return [...tags].sort((a, b) => {
      const la = (a.label || a.tag).toLocaleLowerCase()
      const lb = (b.label || b.tag).toLocaleLowerCase()
      return la.localeCompare(lb)
    })
  }, [tags])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter((entry) => {
      const id = entry.tag.toLowerCase()
      const label = (entry.label || '').toLowerCase()
      return id.includes(q) || label.includes(q)
    })
  }, [sorted, query])

  const selectedEntries = useMemo(() => {
    const byId = new Map(tags.map((t) => [t.tag, t]))
    return selected.map((id) => byId.get(id) ?? { tag: id, label: id })
  }, [tags, selected])

  if (tags.length === 0) {
    return (
      <div className="tag-filter">
        <span className="meta">No tags in config.json</span>
      </div>
    )
  }

  function toggle(tag: string) {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag))
    } else {
      onChange([...selected, tag])
    }
  }

  function onTriggerKey(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen(true)
    }
  }

  const summary =
    selected.length === 0
      ? 'Select tags…'
      : `${selected.length} selected`

  return (
    <div className="tag-filter" ref={rootRef}>
      <div className="tag-picker">
        <button
          type="button"
          className={`tag-picker-trigger${open ? ' open' : ''}`}
          aria-expanded={open}
          aria-controls={listId}
          aria-haspopup="listbox"
          onClick={() => {
            setOpen((v) => !v)
            if (open) setQuery('')
          }}
          onKeyDown={onTriggerKey}
        >
          <span>{summary}</span>
          <span className="tag-picker-caret" aria-hidden>
            ▾
          </span>
        </button>

        {open ? (
          <div className="tag-picker-dropdown" id={listId}>
            <label className="sr-only" htmlFor={searchId}>
              Search tags
            </label>
            <input
              ref={searchRef}
              id={searchId}
              className="tag-picker-search"
              type="search"
              value={query}
              placeholder="Search by name or id…"
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setQuery(event.target.value)}
            />
            <ul
              className="tag-picker-list"
              role="listbox"
              aria-multiselectable="true"
              aria-label="Tags"
            >
              {filtered.length === 0 ? (
                <li className="tag-picker-empty">No matches</li>
              ) : (
                filtered.map((entry) => {
                  const active = selected.includes(entry.tag)
                  const color =
                    typeof entry.color === 'string' && entry.color.trim()
                      ? entry.color.trim()
                      : undefined
                  return (
                    <li key={entry.tag} role="option" aria-selected={active}>
                      <button
                        type="button"
                        className={`tag-picker-option${active ? ' active' : ''}`}
                        title={entry.description || entry.tag}
                        onClick={() => toggle(entry.tag)}
                      >
                        <span className="tag-picker-check" aria-hidden>
                          {active ? '✓' : ''}
                        </span>
                        {color ? (
                          <span
                            className="tag-swatch"
                            style={{ backgroundColor: color }}
                            aria-hidden
                          />
                        ) : null}
                        <span className="tag-picker-label">
                          {entry.label || entry.tag}
                        </span>
                        {entry.label && entry.label !== entry.tag ? (
                          <span className="tag-picker-id">{entry.tag}</span>
                        ) : null}
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          </div>
        ) : null}
      </div>

      {selectedEntries.length > 0 ? (
        <div className="tag-chips" aria-label="Selected tags">
          {selectedEntries.map((entry) => {
            const color =
              typeof entry.color === 'string' && entry.color.trim()
                ? entry.color.trim()
                : undefined
            return (
              <button
                key={entry.tag}
                type="button"
                className="tag-chip"
                title={`Remove ${entry.label || entry.tag}`}
                style={
                  color
                    ? {
                        borderColor: color,
                        boxShadow: `0 0 0 1px color-mix(in srgb, ${color} 40%, transparent)`,
                      }
                    : undefined
                }
                onClick={() => toggle(entry.tag)}
              >
                {color ? (
                  <span
                    className="tag-swatch"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                ) : null}
                <span>{entry.label || entry.tag}</span>
                <span className="tag-chip-x" aria-hidden>
                  ×
                </span>
              </button>
            )
          })}
          <button
            type="button"
            className="toolbar-btn tag-clear-all"
            onClick={() => onChange([])}
          >
            Clear all
          </button>
        </div>
      ) : null}
    </div>
  )
}
