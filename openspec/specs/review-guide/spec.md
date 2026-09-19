# review-guide Specification

## Purpose

Gives operators a set-level AI review guide for the selected change set: a yellow Review control opens a floating panel with the change goal and a recommended file order, with path clicks focusing the graph and opening split file view without closing the guide.

## Requirements

### Requirement: Change set may include a review guide

A change-set JSON MAY include an optional top-level `review` object with:

- `goal` — non-empty string: high-level purpose of the change; SHOULD briefly say why review starts with the first path in `order`
- `order` — array of path strings (graph node ids / `nodes[].path` values) in the agent-recommended review sequence

Agents MAY author or refine `review`. Structural node fields remain owned by git export. On re-export, a prior non-empty `review` SHALL be preserved for the change file when the export rewrites that file.

#### Scenario: Valid review loads with the change set

- **WHEN** a change JSON includes `review: { "goal": "…", "order": ["a.ts", "b.ts"] }`
- **THEN** the application loads that guide with the selected change set

#### Scenario: Missing or invalid review

- **WHEN** `review` is absent, or `goal` is empty, or `order` is missing/empty after normalization
- **THEN** the change set loads without a usable review guide (Review control is disabled)

#### Scenario: Re-export preserves review

- **WHEN** an existing change file has a valid `review` and git export overwrites that file id
- **THEN** the new JSON still contains that `review` (unless an agent cleared it before export)

### Requirement: Review button beside Search

The canvas top-right chrome SHALL include a **Review** control next to Search. Its appearance SHALL use the change-set yellow fill and dark text (same visual language as change overlay nodes). The control SHALL be enabled only when a change set is selected and that set has a usable `review` guide; otherwise it SHALL be disabled (not hidden).

#### Scenario: Enabled when guide exists

- **WHEN** the operator selects a change set that has a valid `review`
- **THEN** the Review button is enabled

#### Scenario: Disabled without guide

- **WHEN** no change set is selected, or the selected set has no usable `review`
- **THEN** the Review button is disabled

### Requirement: Toggle review guide with button and Shift+R

The operator SHALL be able to open and close the review guide via the Review button and via **Shift+R**. The hotkey SHALL be ignored when focus is in an editable field, contenteditable, or Monaco editor (same class of ignore rules as other app hotkeys).

#### Scenario: Shift+R toggles the panel

- **WHEN** a usable review guide exists and the operator presses Shift+R outside an ignored target
- **THEN** the floating guide opens if closed, or closes if open

### Requirement: Floating draggable resizable guide panel

The review guide SHALL appear as a floating panel (not a blocking modal backdrop): yellow background, dark text, its own scroll when content overflows after resize. The panel SHALL be draggable and resizable. Default placement SHALL be the top-right area of the viewport. Position and size SHALL be remembered for the browser session while the app remains loaded.

Opening a file from a path in the guide MUST NOT close the guide.

#### Scenario: Panel stays open while opening a file

- **WHEN** the guide is open and the operator activates a path in `order`
- **THEN** the guide remains open after the file viewer opens

#### Scenario: Session remembers geometry

- **WHEN** the operator moves or resizes the guide, closes it, and opens it again in the same session
- **THEN** the panel reappears at the remembered position and size

### Requirement: Path list focuses node and opens split view

Each entry in `review.order` SHALL be shown as an actionable path. Activating a path that exists on the graph SHALL focus/locate that node on the canvas and open the file in **split** view (file beside graph). Paths not on the graph MAY be shown but MUST NOT pretend to succeed at locate/open.

#### Scenario: Click path in order

- **WHEN** the guide lists `shared/auth/store.ts`, that node is on the canvas, and the operator activates it
- **THEN** the canvas focuses that node and the file opens in split view while the guide stays open

### Requirement: Documentation of review field and UI

Project documentation for change sets SHALL describe `review.goal` / `review.order`, agent authorship (initially via `/tag-tree-explain`, refinable by any agent on request), the Review button, Shift+R, and path → split behavior.

#### Scenario: Operator reads change-set docs

- **WHEN** an operator opens change-set documentation
- **THEN** they can find how `review` is authored and how the Review UI works
