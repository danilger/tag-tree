## 1. Only highlighted (isolate empty)

- [x] 1.1 Relabel Mode option to “Only highlighted” (value remains `isolate`)
- [x] 1.2 In `layoutGraph`, when `viewMode === 'isolate'`, show only matching nodes; if no tags selected, use an empty node set (and edges)

## 2. Tag picker UI

- [x] 2.1 Replace flat `TagFilter` checkboxes with dropdown multi-select (open/close, Esc / outside click)
- [x] 2.2 Sort dropdown options A–Z by label (fallback id); filter by case-insensitive substring on id **and** label
- [x] 2.3 Toggle selection preserving addition order in `selectedTags` (append / remove)
- [x] 2.4 Chip strip below: selected only, addition order, dismiss per chip, Clear all when non-empty

## 3. Docs

- [x] 3.1 Update README / DocsModal Mode + tags picker wording (Only highlighted; empty selection)
- [x] 3.2 Align any skill / deep-link copy that still says “Only tagged”
