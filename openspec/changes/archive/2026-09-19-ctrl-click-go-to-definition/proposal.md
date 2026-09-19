## Why

Go-to-definition in the file viewer only works via `gd`. Users expect VS Code–style Ctrl+left-click (⌘ on macOS) on an identifier to jump the same way.

## What Changes

- Ctrl/⌘ + left-click in the Monaco file viewer runs the same graph-assisted go-to-definition as `gd`, using the click position.
- Document the shortcut in README / DocsModal.

## Capabilities

### New Capabilities

- `file-go-to-definition`: Keyboard and mouse ways to open a symbol’s definition from the file viewer.

### Modified Capabilities

- (none)

## Impact

- `src/monacoVimKeys.ts` (or adjacent bind helper) — mouse handler
- README / DocsModal file-viewer shortcuts
