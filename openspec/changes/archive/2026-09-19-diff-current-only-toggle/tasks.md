## 1. FileModal toggle

- [x] 1.1 Add `diffView` state (`side-by-side` | `current`), default `side-by-side`, reset when the open file path changes; header button visible only when reconstructable original exists
- [x] 1.2 When `diffView === 'current'`, render single Editor with modified content and hunk line decorations; when `side-by-side`, keep existing DiffEditor; preserve vim bind / focus behavior

## 2. Docs

- [x] 2.1 Document the side-by-side ↔ current-only (highlighted) toggle in README and DocsModal
