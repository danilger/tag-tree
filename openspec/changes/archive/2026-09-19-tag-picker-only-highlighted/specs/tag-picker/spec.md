## Purpose

Menu tag selection UX (searchable multi-select + selected chips) and Only highlighted view mode behavior that hides non-matching nodes, including an empty graph when no tags are selected.

## ADDED Requirements

### Requirement: Searchable tag multi-select dropdown

The control-menu tag filter SHALL present available config tags in a single dropdown multi-select (not a flat always-visible checkbox list of all tags). The dropdown list SHALL be sorted alphabetically by display label (falling back to tag id). The operator SHALL be able to filter the list by typing a query that matches either the tag id or the label (case-insensitive substring). Selecting a tag in the list SHALL add it to the selection if not already selected; selecting an already-selected tag SHALL remove it (or an equivalent toggle). Closing the dropdown SHALL keep the current selection.

#### Scenario: Filter by label or id

- **WHEN** the operator opens the tag dropdown and types a substring that appears in a tag’s label or id
- **THEN** only matching tags remain visible in the list, still in alphabetical order

#### Scenario: Options sorted A–Z

- **WHEN** the operator opens the tag dropdown with an empty search query
- **THEN** all config tags appear sorted alphabetically by label (or id if label is empty)

### Requirement: Selected tags shown as ordered chips

Below the dropdown, the menu SHALL show only currently selected tags as chips (or equivalent dismissible controls), in the order those tags were added to the selection. Each chip SHALL allow removing that tag from the selection. A **Clear all** control SHALL appear when at least one tag is selected and SHALL clear the entire selection. Unselected tags MUST NOT appear in the chip strip.

#### Scenario: Chip order follows addition

- **WHEN** the operator selects tag `ui`, then `auth`
- **THEN** the chip strip shows `ui` then `auth` (addition order), not alphabetical order

#### Scenario: Dismiss one chip

- **WHEN** the operator dismisses the `ui` chip while `ui` and `auth` are selected
- **THEN** only `auth` remains selected and shown

#### Scenario: Clear all

- **WHEN** the operator activates Clear all with multiple tags selected
- **THEN** no tags remain selected and the chip strip is empty (Clear all hidden or inactive)

### Requirement: Only highlighted mode hides non-matching nodes

The Mode control SHALL offer **Only highlighted** corresponding to view mode value `isolate` (deep-link / state id unchanged). In that mode, the graph SHALL include only nodes that are currently **highlighted** by the same rules Highlight mode uses:

1. If a dependency or AI subtree focus is active, highlighted nodes are those in that subtree
2. Otherwise, if tags are selected, highlighted nodes are those matching the tag filter (Any / Intersection)
3. Otherwise (no focus, no tags), the graph SHALL show **zero** nodes (empty canvas)

#### Scenario: Matched tags only

- **WHEN** Mode is Only highlighted, no subtree focus is active, tag `auth` is selected (Any), and some nodes carry `auth`
- **THEN** only those matching nodes (and edges between visible nodes) appear on the canvas

#### Scenario: Dependency subtree kept

- **WHEN** the operator activates highlight dependency subtree on a node (nodes in the subtree are highlighted) and then selects Mode Only highlighted with no tags selected
- **THEN** the canvas keeps the subtree nodes and hides the rest (not an empty canvas), and the active subtree focus is not cleared merely by changing Mode

#### Scenario: Empty selection empties the graph

- **WHEN** Mode is Only highlighted, no subtree focus is active, and no tags are selected
- **THEN** the canvas shows no file nodes

#### Scenario: Highlight mode unchanged when empty

- **WHEN** Mode is Highlight and no tags are selected
- **THEN** the full graph remains visible (no tag-based dimming)
