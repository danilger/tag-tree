## Why

Operators reviewing a selected change set on the graph get per-file comments and line notes, but no set-level “how to review this change” guide. They need a yellow Review control next to Search that opens a floating guide: high-level goal plus a recommended file order, with clicks focusing the node and opening the file in split without dismissing the guide.

## What Changes

- Extend change-set JSON with optional top-level `review: { goal, order }` (agent-authored; preserved on git re-export).
- Canvas top-right: **Review** button beside Search (yellow + black text, change-overlay look); enabled when a change set is selected and `review` is present; otherwise disabled.
- Toggle the guide with the button or **Shift+R** (free hotkey; ignore when typing in inputs/Monaco).
- Floating guide panel (not a blocking modal): yellow background, draggable, resizable, internal scroll; default top-right; remember position/size for the session.
- Guide content: `goal` (overview + short why the first path in `order` is the review entry point) and clickable `order` paths → locate node on canvas + open file in **split**; guide stays open.
- Document in `changes/README`, skill, and **`/tag-tree-explain`**: command initially writes `review`; any agent may later refine `review` / comments / notes on user request.
- Agent chooses `order` for a sensible review sequence (not necessarily git or export order).

## Capabilities

### New Capabilities

- `review-guide`: Set-level review guide data and canvas floating UI (button, Shift+R, path → split).

### Modified Capabilities

- `agent-explain`: `/tag-tree-explain` also authors `review.goal` and `review.order` when explaining a dirty change set.

## Impact

- Types + `vite-file-api` normalize/load of `review`
- `scripts/export-change-from-git.mjs` preserve `review` on re-export
- `GraphView` / App: Review button, floating panel, hotkey, path open in split
- Docs: `changes/README.md`, README/DocsModal as needed
- `templates/agent-command/tag-tree-explain.md`, skill Agent changes section
