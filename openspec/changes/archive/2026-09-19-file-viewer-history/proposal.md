## Why

After `gd` / Ctrl+click jumps between files, reviewers need browser-like back/forward in the file viewer. Shift+H / Shift+L should walk that history and keep the graph node selection in sync with the shown file.

## What Changes

- Maintain an open-file history stack (path + optional line) for the Monaco viewer.
- Shift+H goes back; Shift+L goes forward while the file viewer is open.
- Navigating history opens that entry and updates graph node focus (selection / blink / fit) without requiring a separate click.
- Plain `h`/`l` hop and Ctrl+Shift+H/L pane focus remain unchanged.

## Capabilities

### New Capabilities

- `file-viewer-history`: Back/forward navigation through recently opened files in the viewer.

### Modified Capabilities

- (none)

## Impact

- `src/App.tsx` — history stack, hotkeys, open/navigate wiring
- `src/GraphView.tsx` — optional locate without stealing keyboard focus; ignore Shift for hop H/L
- `src/monacoVimKeys.ts` — do not treat Shift+H/L as cursor move
- README / DocsModal
