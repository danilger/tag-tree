# change-overlay Specification

## Purpose

Defines how graph nodes belonging to the selected change set are visually marked on the canvas so they remain distinct from tag, config, and focus styling.

## Requirements

### Requirement: Change nodes use reserved cross-hatching fill

When a change set is selected, each matching canvas node MUST show a bright yellow background with one-direction pale hatching on top and dark, high-contrast text. This yellow+hatching fill is reserved for change-set overlay and MUST NOT be used for tag highlight, config node colors, dependency/AI subtree focus, or search blink.

#### Scenario: Selected change set paints hatching

- **WHEN** the operator selects a change set that includes node path `a.ts`
- **AND** `a.ts` is visible on the canvas
- **THEN** that node’s background uses bright yellow with one-direction hatching (not crossing diagonals)
- **AND** the node text is dark enough to remain readable on that background
- **AND** the node does not use a dedicated green change border or green glow for the change overlay

#### Scenario: Clearing the change set removes hatching

- **WHEN** the operator clears the change selection (`No changes`)
- **THEN** nodes no longer show the change cross-hatching fill

### Requirement: No green change border overlay

The change overlay MUST NOT set a special green border color or green outer glow. Border appearance for change nodes MUST fall back to the normal node border (and any non-change styling such as tag/config colors when those still apply outside the change fill).

#### Scenario: Change overlay does not force green chrome

- **WHEN** a node has `changeOverlay` active
- **THEN** its border is not forced to the former change green (`#00c853` or equivalent)
- **AND** no green change-specific box-shadow glow is applied for the overlay

### Requirement: Docs reserve hatching for changes

Product documentation MUST state that bright yellow with cross-hatching on canvas nodes marks membership in the selected change set and is reserved for that purpose (not for other highlights).

#### Scenario: Docs describe reserved hatching

- **WHEN** an operator reads the README or in-app documentation about the Changes dropdown / canvas overlay
- **THEN** the text describes yellow + cross-hatching (not a green fill/border) as the change marker
- **AND** notes that this fill pattern is reserved for change-set display
