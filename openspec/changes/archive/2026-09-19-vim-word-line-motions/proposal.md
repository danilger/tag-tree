## Why

The read-only Monaco viewer already supports hjkl / gg / G. Reviewers need vim-like word and line-edge motions (`w`, `b`, `0`, `$`) without leaving the keyboard.

## What Changes

- Bind `w` / `b` to next / previous word start in the file viewer.
- Bind `0` / `$` to start / end of the current line.
- Document in README / DocsModal.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `file-go-to-definition` is unrelated; extend viewer motion docs only via a small capability:
- `file-viewer-vim-motions`: Read-only vim motions in the Monaco file viewer (including word and line-edge keys).

## Impact

- `src/monacoVimKeys.ts`
- README / DocsModal
