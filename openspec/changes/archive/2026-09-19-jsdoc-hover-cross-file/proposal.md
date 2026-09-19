## Why

JSDoc hover currently only works when the cursor is on a local declaration with a comment above it. Reviewers usually hover imported symbols at call sites and need the documentation from the defining (often neighboring) file — the same target `gd` already resolves.

## What Changes

- On hover over an identifier, resolve definition via the existing import-graph helper, load that file when needed, and show the JSDoc above the definition line.
- Keep working for same-file definitions; remove the “must be on a declaration line in the open buffer” limitation for the primary path.
- Update README / DocsModal wording accordingly.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `file-jsdoc-hover`: Hover uses definition-site JSDoc (including other files), not only local declaration hover.

## Impact

- `src/jsdocHover.ts` — async hover via `resolveDefinition` + file fetch
- `src/goToDefinition.ts` — export file fetch helper if needed
- `src/FileModal.tsx` — supply current path / importTargets to hover context
- README / DocsModal
