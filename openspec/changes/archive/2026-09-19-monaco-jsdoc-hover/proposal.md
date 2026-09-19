## Why

When reviewing a file in the Monaco viewer, hovering a function (or similar declaration) at its implementation site does not show the JSDoc above it. Reviewers lose documentation that would appear in VS Code, and the app already uses a lightweight custom `gd` rather than a full TypeScript language service.

## What Changes

- On hover over a declaration name in the file viewer (Editor and DiffEditor modified pane), show the immediately preceding `/** … */` JSDoc in Monaco’s hover tooltip when present.
- Apply only to JS/TS languages; no full project language service or cross-file type info.
- Document the hover behavior briefly in in-app / README docs if file-viewer shortcuts are listed.

## Capabilities

### New Capabilities

- `file-jsdoc-hover`: Local JSDoc hover at declaration sites in the Monaco file viewer.

### Modified Capabilities

- (none)

## Impact

- New helper module for extracting JSDoc above a declaration (reuse `identifierAt` / declaration line detection where useful)
- `FileModal` Monaco `onMount`: register hover provider for `typescript` / `javascript`
- Optional README / DocsModal note
