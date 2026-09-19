# file-go-to-definition Specification

## Purpose

Open a symbol’s definition from the Monaco file viewer via keyboard or mouse using the graph-assisted resolver (not a full TypeScript language service).

## Requirements

### Requirement: Ctrl/⌘ left-click goes to definition

When the file viewer has bound go-to-definition and the user left-clicks in the editor text while holding Ctrl (or ⌘ on macOS), the application SHALL move the caret to the click position and run the same go-to-definition action as `gd` (graph-assisted resolve; jump within the file or open the definition path).

#### Scenario: Ctrl+left-click on an identifier

- **WHEN** the file viewer is open with go-to-definition enabled
- **AND** the user left-clicks an identifier while holding Ctrl or ⌘
- **THEN** the application resolves the definition for that click position the same way as `gd`

#### Scenario: Plain left-click does not jump

- **WHEN** the user left-clicks without Ctrl or ⌘
- **THEN** go-to-definition is not triggered solely by that click
