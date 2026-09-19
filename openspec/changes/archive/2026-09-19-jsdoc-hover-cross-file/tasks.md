## 1. Definition-site JSDoc hover

- [x] 1.1 Resolve hover via `resolveDefinition`, load definition file when needed, extract JSDoc above definition line
- [x] 1.2 Pass current path / importTargets into hover context from FileModal; clear when closed
- [x] 1.3 Update README / DocsModal to describe cross-file JSDoc hover

## 2. Cleanup

- [x] 2.1 Keep local declaration fallback only when definition resolve fails but cursor is on a local documented declaration
