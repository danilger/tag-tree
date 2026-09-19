## Purpose

Change-set nodes carry a file-level comment and optional line-anchored notes; the file viewer lets the operator choose how those comments are shown.

## ADDED Requirements

### Requirement: File-level comment remains available

The system SHALL continue to support an optional non-empty file-level comment on each change-set node (existing `comment` field). When the selected display mode includes the file summary, that text SHALL appear above the code view for that file.

#### Scenario: Summary mode shows file comment

- **WHEN** the operator opens a change file whose node has a non-empty `comment` and selects the Summary display mode
- **THEN** the file comment is shown above the editor and line notes are not shown as inline annotations

#### Scenario: Missing file comment

- **WHEN** the node has no `comment` or an empty `comment`
- **THEN** the summary block is omitted (no empty placeholder required)

### Requirement: Per-line notes on change nodes

Each change-set node MAY include an optional `notes` array. Each note SHALL have a positive integer `line` (1-based line number in the **current** file content) and a non-empty `text` string. Agents MAY author `notes`; structural fields (`path`, `rows`, `prev_row`) remain owned by git export.

#### Scenario: Valid notes load with the change set

- **WHEN** a change JSON includes `notes: [{ "line": 12, "text": "Why this changed" }]` on a node
- **THEN** the application loads that note and associates it with line 12 of the current file for that node

#### Scenario: Invalid notes are ignored safely

- **WHEN** a note lacks a positive `line`, has empty `text`, or is otherwise malformed
- **THEN** that note is ignored without failing to load the rest of the change set

### Requirement: Display-mode select in the file viewer header

The file viewer header SHALL include a select control that chooses how comments are displayed for the open file. At minimum the options SHALL be:

- **Summary** — file-level comment only (when present)
- **Inline** — per-line notes only, shown adjacent to the corresponding lines in the code view
- **Both** — file-level comment and per-line notes together

The selected mode SHALL apply for the current modal session for that open file (persisting across files/sessions is optional and not required).

#### Scenario: Operator switches to Inline

- **WHEN** the operator selects Inline and the node has one or more valid notes
- **THEN** notes appear next to their lines in the code view and the file summary block is hidden

#### Scenario: Operator switches to Both

- **WHEN** the operator selects Both, the node has a file `comment` and at least one valid note
- **THEN** the summary appears above the editor and notes appear next to their lines

#### Scenario: No notes in Inline mode

- **WHEN** the operator selects Inline and the node has no valid notes
- **THEN** the code view shows no inline note annotations and no summary block

### Requirement: Inline notes align to current-file lines

Inline notes SHALL be anchored to 1-based line numbers of the **current** file content shown for that change node. Notes whose `line` is outside the current file’s line count MAY be omitted from display.

#### Scenario: Note on an in-range line

- **WHEN** a note’s `line` is between 1 and the number of lines in the current file
- **THEN** that note is eligible to render in Inline or Both mode next to that line

#### Scenario: Note out of range

- **WHEN** a note’s `line` is less than 1 or greater than the current file line count
- **THEN** that note is not shown as an inline annotation

### Requirement: Git re-export preserves authored comments and notes

When regenerating a change JSON from git for the same target filename, the export SHALL preserve a non-empty file `comment` and valid `notes` for nodes whose `path` still exists in the new export. Notes for paths removed from the change set MAY be dropped. Matching for notes SHALL be by `path` (and for merge of the notes list, by `line` within that path).

#### Scenario: Re-export keeps comment and notes

- **WHEN** an existing change file has path `src/Foo.tsx` with a file `comment` and notes on lines 10 and 20, and git re-export still includes that path
- **THEN** the new JSON for that path retains the same `comment` and those notes (unless the agent intentionally clears them before export)

### Requirement: Documentation of notes and display modes

Project documentation for change sets SHALL describe the `comment` and `notes` fields, agent authorship rules, and the file-viewer display-mode select.

#### Scenario: Operator reads change-set docs

- **WHEN** an operator opens the change-set documentation
- **THEN** they can find how to add file comments, line notes, and how the header select affects display
