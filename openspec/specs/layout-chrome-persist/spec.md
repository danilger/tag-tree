# layout-chrome-persist Specification

## Purpose

Persist split / zoom / Explorer chrome so operators keep their layout across page reloads.

## Requirements

### Requirement: Layout chrome persists in localStorage

The application SHALL persist `splitView`, `fileZoomed` (file zoom in split), `explorerOpen`, and `splitRatio` to `localStorage` whenever they change, and SHALL restore them when the app loads. If `splitView` is false, restored `fileZoomed` MUST be treated as false. Invalid or missing stored values SHALL fall back to defaults (split off, zoom off, explorer closed, ratio 0.5). Closing the file viewer MUST NOT clear persisted `splitView`, `fileZoomed`, or `explorerOpen` preferences.

#### Scenario: Restore explorer open

- **WHEN** the operator leaves Explorer open and reloads the page
- **THEN** Explorer is open again after load

#### Scenario: Restore split and zoom

- **WHEN** the operator uses split view with file zoom enabled and reloads
- **THEN** split view and file zoom are restored after load

#### Scenario: Close file keeps layout prefs

- **WHEN** the operator closes the file viewer while split (and optionally zoom) is enabled
- **THEN** `splitView` / `fileZoomed` / `explorerOpen` remain as they were
- **AND** the next file open reuses that layout (split/zoom) without requiring the operator to toggle them again

#### Scenario: Corrupt storage falls back

- **WHEN** the stored layout value is missing or not valid JSON/booleans
- **THEN** the app uses default layout chrome values without crashing
