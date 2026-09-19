# file-diff-view Specification

## Purpose

Controls how the file viewer shows change-set diffs: full side-by-side comparison versus a single pane of the current file with changed lines highlighted.

## Requirements

### Requirement: Toggle side-by-side and current-only diff views

When the file viewer is showing a change-set diff with a reconstructable original (side-by-side DiffEditor is available), the UI MUST provide a control that toggles between side-by-side diff and a current-only view. The current-only view MUST show the modified file content in a single editor and MUST highlight changed line ranges using the same whole-line highlight and margin markers used when decorations-only mode is active today.

#### Scenario: Default is side-by-side

- **WHEN** the operator opens a change-set node that has `prev_row` (or equivalent reconstructable original)
- **THEN** the viewer shows side-by-side DiffEditor by default
- **AND** a toggle control for current-only view is visible in the file viewer chrome

#### Scenario: Switch to current-only with highlights

- **WHEN** the operator activates the current-only toggle while a side-by-side change diff is shown
- **THEN** the viewer shows a single editor with the current (modified) file content
- **AND** changed hunk line ranges are highlighted (line background and margin marker)
- **AND** the original pane is not shown

#### Scenario: Switch back to side-by-side

- **WHEN** the operator is in current-only view for a change diff
- **AND** activates the toggle again (or chooses side-by-side)
- **THEN** the viewer returns to side-by-side DiffEditor with original and modified

#### Scenario: No toggle without reconstructable original

- **WHEN** change hunks exist but there is no reconstructable original (decorations-only path)
- **THEN** the viewer stays on the single decorated editor
- **AND** the side-by-side / current-only toggle is not required (control may be hidden)

### Requirement: Document the diff view toggle

Documentation MUST mention that while viewing a change-set diff, the operator can switch between side-by-side and current-only (highlighted) views.

#### Scenario: Docs mention the control

- **WHEN** an operator reads README or in-app docs for the file viewer / Changes workflow
- **THEN** the text describes the toggle between side-by-side diff and current-only highlighted view
