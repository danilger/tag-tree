## Why

The menu tag list grows unwieldy as `config.json` accumulates tags, and the “Only tagged” mode name does not match how operators think about dimmed vs highlighted nodes. Operators need a searchable multi-select, a compact selected-chip strip, and a mode that keeps **only** highlighted (tag-matched) nodes — including an empty canvas when nothing is selected.

## What Changes

- Relabel Mode option **Only tagged** → **Only highlighted** (same underlying `isolate` value for deep links / state)
- When Mode is Only highlighted and **no tags are selected**, the graph shows **no nodes** (empty), instead of showing the full graph
- Replace the flat tag checkbox list with a **dropdown multi-select**: typeahead search over tag **id and label**, options sorted **A–Z**
- Below the picker, show **only selected** tags as chips in **selection order**; chip dismiss removes that tag; **Clear all** clears the selection
- Keep Tags Any / Intersection behavior unchanged
- Update README / DocsModal labels for the renamed mode and the new picker UX (brief)

## Capabilities

### New Capabilities

- `tag-picker`: Searchable tag multi-select dropdown + selected-chip strip (order, clear, dismiss)

### Modified Capabilities

- `url-deep-links`: Scenario / docs wording for `mode=isolate` — UI name **Only highlighted** (was Only tagged); empty-tags + isolate empty-canvas behavior if described anywhere in that capability

## Impact

- `src/TagFilter.tsx` (or replacement) — major UI rewrite
- `src/App.tsx` — Mode select label; possibly chip state order if not derived from `selectedTags` array order
- `src/GraphView.tsx` `layoutGraph` — empty selection under `isolate` → empty node set
- `src/DocsModal.tsx`, `README.md` — Mode / tags UX copy
- Deep links (`mode=isolate`, `tags=…`) remain compatible; no new mode id required
