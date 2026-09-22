## Why

Operators browsing large source files in the Monaco file viewer need a quick way to collapse and expand structural folds (functions, classes, blocks) without hunting for gutter chevrons. Monaco already supports folding and its default keyboard shortcuts; the UI should surface the three most useful actions as header buttons with those shortcuts documented in native tooltips—without adding any new keybindings that would conflict with Zoom (`Z`) or vim motions.

## What Changes

- Add three icon-only fold controls to the file viewer header (modal and split panel): fold one level, unfold one level, and fold all.
- Each button triggers the matching Monaco editor command on the active (modified) editor instance and documents the stock Monaco shortcut in its native `title` / accessible name.
- No new keyboard bindings; existing Monaco defaults (`Ctrl+Shift+[`, `Ctrl+Shift+]`, `Ctrl+K Ctrl+0`) remain the only shortcuts.

## Capabilities

### New Capabilities

- `file-viewer-fold-controls`: Header icon buttons that fold / unfold / fold-all via Monaco built-in commands, with tooltips listing the standard Monaco shortcuts.

### Modified Capabilities

- (none)

## Impact

- `src/FileModal.tsx` — header actions, wire buttons to `editorRef` / Monaco triggers.
- `src/styles.css` — compact icon button styling in `.modal-actions` if needed.
- Optional docs mention in `DocsModal` for discoverability (non-blocking).
- No API, backend, or dependency changes; relies on Monaco’s built-in folding contribution already enabled by default.
