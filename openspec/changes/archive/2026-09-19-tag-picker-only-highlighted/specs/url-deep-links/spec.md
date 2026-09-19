## MODIFIED Requirements

### Requirement: Query params restore menu and layout chrome

On application load, the app SHALL read URL query parameters and apply recognized values to UI state. Supported parameters SHALL include at least:

- `tags` — one or more tag ids (comma-separated and/or repeated keys) for multi-select
- `match` — `any` or `all` (tag match mode)
- `mode` — `highlight`, `isolate`, or `changed` (view mode; UI label for `isolate` is **Only highlighted**)
- `change` — agent change-set id (empty / omitted clears selection)
- `theme` — `light` or `dark`
- `explorer` — `0` or `1` (Explorer open)
- `menu` — `0` or `1` (burger menu panel open)
- `split` — `0` or `1` (prefer split file view)
- `zoom` — `0` or `1` (file zoom; effective only with split)
- `ratio` — split divider fraction in a valid range used by the app

When a parameter is present and valid, it SHALL override localStorage defaults for that field. When absent or invalid, the app SHALL keep localStorage / built-in defaults for that field and MUST NOT fail to load.

#### Scenario: Multi-tag isolate AND

- **WHEN** the user opens `?tags=auth,ui&match=all&mode=isolate`
- **THEN** both tags are selected, match mode is intersection (all), and view mode is Only highlighted

#### Scenario: Invalid mode ignored

- **WHEN** the URL contains `mode=nope`
- **THEN** the app loads with the default or stored view mode and does not crash
