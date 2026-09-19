## Purpose

Shareable URL query deep links that restore tag-tree menu filters, open a file in the viewer, and/or focus a canvas node, with agent-facing documentation for composing those links.

## ADDED Requirements

### Requirement: Query params restore menu and layout chrome

On application load, the app SHALL read URL query parameters and apply recognized values to UI state. Supported parameters SHALL include at least:

- `tags` — one or more tag ids (comma-separated and/or repeated keys) for multi-select
- `match` — `any` or `all` (tag match mode)
- `mode` — `highlight`, `isolate`, or `changed` (view mode)
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
- **THEN** both tags are selected, match mode is intersection (all), and view mode is Only tagged

#### Scenario: Invalid mode ignored

- **WHEN** the URL contains `mode=nope`
- **THEN** the app loads with the default or stored view mode and does not crash

### Requirement: Deep link opens a file in the viewer

The query parameters `file` (graph node id / path) and optional `line` (1-based) SHALL open that file in the file viewer after the graph is available. Viewer presentation SHALL honor `split` / `zoom` (and existing layout prefs when those params are omitted). If `file` is missing from the graph or fails to load, the app SHALL show the normal file error path without breaking the rest of the UI.

#### Scenario: Open file at line in split

- **WHEN** the URL includes `file=shared/auth/store.ts&line=42&split=1`
- **THEN** after graph load the viewer opens that path near line 42 in split layout

#### Scenario: Unknown file

- **WHEN** the URL includes `file=does/not/exist.ts`
- **THEN** the app attempts open and surfaces a file load error without crashing the graph

### Requirement: Deep link focuses a canvas node

The query parameter `focus` (graph node id) SHALL locate and select that node on the canvas after the graph is laid out (same class of behavior as Search / locate). `focus` MAY be combined with `file` (same or different ids). If the node is not found, focus is a no-op for locate and MUST NOT crash.

#### Scenario: Focus only

- **WHEN** the URL includes `focus=shared/auth/store.ts` and no `file`
- **THEN** the canvas focuses that node without necessarily opening the file viewer

#### Scenario: Focus and open

- **WHEN** the URL includes both `file` and `focus` for the same path with `split=1`
- **THEN** the file opens in split and the canvas selects/focuses that node

### Requirement: Optional review guide from URL

When `review=1` and the selected change set has a usable review guide, the app SHALL open the Review guide panel after load. When `review=1` but no usable guide exists, the param is ignored.

#### Scenario: Review opens with change

- **WHEN** the URL includes a valid `change` id with review data and `review=1`
- **THEN** the Review guide panel is open after load

### Requirement: URL stays in sync with UI

After the initial parse, when the operator changes any deep-linkable UI field (tags, match, mode, change, theme, explorer, menu, split, zoom, ratio, open file/line, canvas focus/anchor as applicable), the app SHALL update the browser URL via `history.replaceState` (or equivalent) so the address bar remains a valid shareable link. Ephemeral actions (Reload click, Docs modal) MUST NOT be required to appear as sticky query params.

#### Scenario: Toggle tag updates URL

- **WHEN** the operator selects an additional tag in the menu
- **THEN** the `tags` query parameter in the address bar reflects the new selection without a full page reload

### Requirement: Agent skill documents link composition

The packaged agent skill template SHALL describe how to build tag-tree deep links: base origin, parameter names and allowed values, multi-tag encoding, file/line/split, focus, change/review, and at least two concrete examples. Operators who refresh installed skills via `tag_tree init --force` SHALL receive that documentation. README and/or DocsModal SHALL include a short human-facing reference to the same contract.

#### Scenario: Skill lists query params

- **WHEN** an agent reads the installed tag-tree skill’s deep-link section
- **THEN** it can compose a URL with multiple tags, match mode, view mode, file open, and node focus
