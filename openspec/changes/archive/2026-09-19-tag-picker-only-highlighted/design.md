## Context

See proposal.md — Why. Today `TagFilter` renders every `configTags` entry as a checkbox label; `selectedTags: string[]` in `App` already preserves insertion order if we only append/remove. `layoutGraph` treats `viewMode === 'isolate' && filterOn` as hide non-matching; when `filterOn` is false under isolate it currently shows the **full** graph — that must change to an empty set. Mode select label is “Only tagged”; deep-link value remains `isolate`.

## Goals / Non-Goals

**Goals:**

- Dropdown multi-select with A–Z list + substring search on id and label
- Chip strip = selected only, addition order, dismiss + Clear all
- Only highlighted (`isolate`) + empty tags → zero nodes
- Keep Any/Intersection, Highlight, Only changed, and `mode=isolate` deep links

**Non-Goals:**

- New ViewMode id (no `only-highlighted` string in URL)
- Third-party combobox libraries
- Changing tag match semantics (OR/AND)
- Persisting chip order separately from `selectedTags` array

## Decisions

### Keep `isolate` as the mode value; rename UI only

**Choice:** Option text → “Only highlighted”; value stays `isolate`.

**Why:** Deep links and `urlState` already encode `mode=isolate`; avoids **BREAKING** URL contract.

**Alternative:** New `highlighted` mode id — rejected (breaks existing links; duplicate of isolate).

### Empty selection under isolate → empty graph (unless subtree focus)

**Choice:** When `viewMode === 'isolate'`, keep nodes that Highlight would mark highlighted: active deps/AI subtree first, else tag matches; if neither, `sourceNodes = []`.

**Why:** Operators use “Only highlighted” after turning on a dependency subtree and expect that set to remain; tag-only empty selection still yields an empty canvas.

**Alternative:** Tags-only filter — rejected after operator feedback (subtree wiped).

### Selection order = `selectedTags` array order

**Choice:** Append on add; filter-out on remove; chips map `selectedTags` in array order. Dropdown list sorted A–Z independently.

**Why:** No extra state; URL `tags=` order can remain whatever `buildDeepLink` already serializes (document if join order follows selection).

### Custom dropdown, not native `<select multiple>`

**Choice:** Button/popover + searchable list + checkmarks, built in React like existing toolbar controls.

**Why:** Native multi-select cannot do typeahead + chips UX cleanly; keep zero new deps.

**Alternative:** Headless library — rejected for a small menu control.

### Search: case-insensitive substring on `tag` and `label`

**Choice:** Match if query is contained in either field (trim; empty query shows all).

## Risks / Trade-offs

- **[Risk] Empty isolate surprises users who relied on “no tags = full graph”** → Mitigation: Docs/README note; Highlight remains the default overview mode
- **[Risk] Long tag lists / focus trap in menu** → Mitigation: Esc closes dropdown; click-outside closes; keep list scrollable
- **[Risk] Deep-link docs still say “Only tagged”** → Mitigation: Update DocsModal, README, and url-deep-links scenario wording in this change
- **[Risk] viewMode change cleared subtree focus** → Mitigation: do not reset `focus` on viewMode alone so Only highlighted can keep the active deps/AI set

## Migration Plan

No data migration. Deploy is a normal UI ship. Rollback = revert change; old `mode=isolate` URLs keep working.

## Open Questions

None — chip order, search fields, and empty-graph behavior decided with the operator.
