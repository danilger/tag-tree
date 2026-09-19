## Purpose

AI-authored explanation notes stored under `notes/`, selectable via a searchable single-select next to Review, with a pale-blue guide panel and node overlay, mutually exclusive with the yellow change-set layer, plus an agent command to author notes with a required viewing map of participating paths.

## ADDED Requirements

### Requirement: Notes live in notes/ with label and viewing map

The application SHALL load AI notes from JSON files in a `notes/` directory (sibling concept to `changes/`, not mixed into it). Each note file SHALL include:

- `label` — non-empty human-readable string shown in the UI dropdown (MUST be distinct enough for operators to tell notes apart)
- `guide` — object with non-empty `goal` (string) and non-empty `order` (array of graph node id paths): the **viewing map** of nodes that participate in the note, in recommended reading order
- `nodes` — array of entries with at least `path` (graph node id); MAY include `comment` (file narrative) and `notes` (`{ line, text }` line anchors on the current file)

Structural Diff fields (`prev_row`, `rows`) are NOT required for notes. Every note that is usable in the UI MUST have a valid `label` and `guide` viewing map. Agents author note JSON; the `/tag-tree-note` workflow SHALL require that viewing map.

#### Scenario: Valid note loads

- **WHEN** `notes/how-auth-works.json` contains a non-empty `label`, `guide.goal`, non-empty `guide.order`, and `nodes`
- **THEN** the note appears in the AI notes list under that `label` and can open its guide

#### Scenario: Missing viewing map

- **WHEN** a note JSON lacks `guide` or has empty `goal` / empty `order`
- **THEN** it is not treated as a usable guided note (must not enable the notes guide as if complete)

### Requirement: API lists and loads notes

The server SHALL expose list and get endpoints for notes analogous to change sets (e.g. `GET /api/notes`, `GET /api/notes/:id`) returning summaries (`id`, `label`) and full note payloads respectively.

#### Scenario: List returns labels

- **WHEN** the client requests the notes list
- **THEN** each entry includes `id` and human-readable `label`

### Requirement: AI notes single-select beside Review

The canvas top-right chrome SHALL include an **AI notes** control next to Review. It SHALL be a searchable single-select dropdown (search by label and/or id; options sorted for scanability) listing available notes by `label`, plus a clear/none option. It MUST NOT be a multi-select.

#### Scenario: Pick one note

- **WHEN** the operator chooses a note in the dropdown
- **THEN** that note becomes the active note and its label remains visible as the selection

#### Scenario: Clear note

- **WHEN** the operator clears the AI notes selection
- **THEN** no note is active and note overlay/guide tied to that selection close or disable appropriately

### Requirement: Mutual exclusion with change sets

The notes overlay layer and the agent change-set overlay layer SHALL be mutually exclusive. Activating a note SHALL clear the selected change set (and close Review guide if open). Selecting a change set SHALL clear the active note (and close the notes guide if open).

#### Scenario: Selecting a note clears changes

- **WHEN** a change set is selected and the operator picks an AI note
- **THEN** the change set selection is cleared and yellow change overlay is not shown; pale-blue note overlay applies instead

#### Scenario: Selecting a change clears notes

- **WHEN** an AI note is active and the operator selects a change set
- **THEN** the note selection is cleared and note overlay/guide are not active

### Requirement: Pale-blue notes guide panel and Shift+N

When a usable note is active, the operator SHALL be able to open a floating **AI notes** guide panel (separate component from the Review panel) showing `guide.goal` and the `guide.order` viewing map. Path clicks SHALL focus the node and open split file view without closing the guide (same interaction class as Review). **Shift+N** SHALL toggle the notes guide when a usable note is active (ignore when typing in inputs/editors, same class of rules as Shift+R). Control, panel chrome, and related affordances SHALL use a pale-blue visual language (distinct from change-set yellow).

#### Scenario: Shift+N toggles guide

- **WHEN** a usable note is selected and the operator presses Shift+N outside an ignored target
- **THEN** the AI notes guide panel toggles open/closed

#### Scenario: Path in map opens file

- **WHEN** the notes guide is open and the operator clicks a path in `guide.order`
- **THEN** that node is focused and opened in split view; the guide stays open

### Requirement: Pale-blue node overlay and file comments without Diff

While a note is active, graph nodes listed in that note’s participating paths SHALL use a pale-blue overlay (not change-set yellow). Opening such a node in the file viewer SHALL surface that node’s `comment` and line `notes` using the existing comments UX where practical, without requiring Monaco Diff / `prev_row`.

#### Scenario: Note node shows comments

- **WHEN** a note is active and the operator opens a participating file that has `comment` / `notes`
- **THEN** those texts are available in the file viewer without requiring a side-by-side diff

### Requirement: Agent command /tag-tree-note

The packaged agent skill / Cursor command set SHALL include **`/tag-tree-note`** (or the same name documented in templates) that instructs agents how to create or update a `notes/<id>.json` for a user question: write a clear `label`, required `guide` viewing map of all participating paths, file `comment`s and line `notes` as needed. The command SHALL remind agents they MAY include shareable tag-tree deep-link URLs to specific nodes (`file`, `focus`, tags, etc.) in the goal or comments when that helps the user explore the answer. Operators who refresh skills via `init --force` SHALL receive this command documentation.

#### Scenario: Command requires viewing map

- **WHEN** an agent follows `/tag-tree-note` to author a note
- **THEN** the instructions require a non-empty `guide.order` covering participating nodes and a human-readable `label`

### Requirement: Mode Only notes

The Mode control in the top menu SHALL offer **Only notes** corresponding to view mode value `notes`. In that mode, the graph SHALL include only nodes that participate in the active AI note (same path set as the pale-blue overlay). If no note is selected (or the note has no participating paths), the canvas SHALL be empty. Edges SHALL be kept only when both endpoints remain visible (same class as Only changed).

#### Scenario: Only notes with a note selected

- **WHEN** an AI note is active and Mode is Only notes
- **THEN** only participating note paths are shown on the canvas

#### Scenario: Only notes with no note

- **WHEN** Mode is Only notes and no AI note is selected
- **THEN** the canvas shows no nodes
