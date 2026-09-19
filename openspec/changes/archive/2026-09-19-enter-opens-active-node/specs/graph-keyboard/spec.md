## Purpose

Canvas keyboard shortcuts for selecting, hopping between dependency edges, and opening the active file node in the Monaco viewer.

## ADDED Requirements

### Requirement: Enter opens the active canvas node

When the graph canvas handles keyboard input and a node is active, pressing Enter without modifier keys SHALL open that node’s file in the existing file viewer (modal or split panel). The active node is the hop preview target when hop is in preview with a selected index; otherwise it is the current selected anchor. If no active node exists, Enter MUST be a no-op for opening.

#### Scenario: Enter opens selected anchor

- **WHEN** a canvas node is selected as the hop anchor and hop is not awaiting a digit buffer commit
- **AND** the user presses Enter without Ctrl/Meta/Alt
- **THEN** the application opens that node’s file in the file viewer

#### Scenario: Enter opens hop preview target

- **WHEN** hop preview is active with a chosen neighbor index
- **AND** the digit buffer is empty
- **AND** the user presses Enter without Ctrl/Meta/Alt
- **THEN** the application opens the previewed neighbor’s file in the file viewer

#### Scenario: Enter still commits multi-digit hop choice

- **WHEN** hop is active and the digit buffer contains a pending edge number
- **AND** the user presses Enter
- **THEN** the digit choice is committed to hop preview
- **AND** the file viewer is not opened solely because of that Enter

#### Scenario: Ignored in text fields and editors

- **WHEN** focus is inside Monaco, a modal text field, Explorer, or node search (same ignore set as other canvas hop keys)
- **AND** the user presses Enter
- **THEN** this canvas open behavior does not run
