## 1. Notes storage + API

- [x] 1.1 Add `notes/` directory + README (schema: `label`, `guide`, `nodes`)
- [x] 1.2 Implement `GET /api/notes` and `GET /api/notes/:id` (mirror changes handlers)

## 2. App selection + mutual exclusion

- [x] 2.1 Load note summaries; selected note state with required `label` display
- [x] 2.2 Mutual exclusion: selecting a note clears change set / Review; selecting a change clears note / notes guide

## 3. Canvas chrome + pale-blue overlay

- [x] 3.1 Searchable single-select AI notes control beside Review (search label/id; clear/none)
- [x] 3.2 Pale-blue node overlay for note participating paths; file viewer comments without Diff
- [x] 3.3 Dedicated AI notes guide panel + Shift+N toggle (pale-blue chrome)

## 4. Agent command + docs

- [x] 4.1 Add `/tag-tree-note` command (+ skill mention): require label + viewing map; remind deep links to nodes when helpful
- [x] 4.2 README / DocsModal short reference for AI notes vs Review

## 5. Mode: Only notes

- [x] 5.1 Add `ViewMode` `notes` + Mode select **Only notes**; filter canvas to note participating paths (empty if none)
- [x] 5.2 Deep link `mode=notes` + README / DocsModal / skill mention
