# file-viewer-history Specification

## Purpose

Back/forward navigation through files opened in the Monaco file viewer, keeping graph node selection aligned with the shown file.

## Requirements

### Requirement: Shift+H / Shift+L walk open-file history

While the file viewer is open, pressing Shift+H without Ctrl/Meta/Alt SHALL open the previous entry in the viewer open-file history (if any). Shift+L SHALL open the next entry (if any). Each history entry stores a file path and an optional jump line. Opening a file outside of history navigation SHALL append to the history and discard any forward entries. History navigation SHALL update the graph’s selected/anchor node to the shown file path.

#### Scenario: Back after go-to-definition

- **WHEN** the user opens file A then jumps to file B via go-to-definition
- **AND** the user presses Shift+H with the file viewer open
- **THEN** the viewer shows file A again
- **AND** the graph selects/focuses node A

#### Scenario: Forward after back

- **WHEN** the user has navigated back from B to A via Shift+H
- **AND** the user presses Shift+L
- **THEN** the viewer shows file B again (including its stored jump line when present)
- **AND** the graph selects/focuses node B

#### Scenario: New open truncates forward history

- **WHEN** the user is not at the end of history (after going back)
- **AND** the user opens a different file by normal open / definition jump
- **THEN** entries after the current history position are discarded
- **AND** the new file is appended as the latest entry

#### Scenario: Hop keys unchanged

- **WHEN** the user presses plain `h` or `l` (without Shift) on the canvas
- **THEN** dependency hop behavior is unchanged
- **AND** Shift+H / Shift+L on the canvas do not start a hop
