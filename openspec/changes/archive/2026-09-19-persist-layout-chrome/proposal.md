## Why

Split mode, file zoom, and Explorer open/closed reset on every reload. Operators who keep Explorer open or work in split lose that chrome state and must re-toggle each session.

## What Changes

- Persist `splitView`, `fileZoomed` (zoom), and `explorerOpen` in `localStorage` (same pattern as theme).
- Also persist `splitRatio` with split so the divider position survives reload.
- Restore these values on app load.

## Capabilities

### New Capabilities

- `layout-chrome-persist`: Persist file-viewer chrome layout (split, zoom, explorer) across reloads.

### Modified Capabilities

- (none)

## Impact

- `src/App.tsx` — read/write layout chrome from localStorage
