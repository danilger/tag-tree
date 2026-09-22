# file-viewer-fold-controls Specification

## Purpose

Header icon controls in the Monaco file viewer that fold, unfold, and fold-all using Monaco’s folding model, documenting stock shortcuts in tooltips where they apply, without adding app-level keybindings.

## Requirements

### Requirement: Fold control buttons in the file viewer header

While a file is open in the file viewer (modal or split panel), the header action bar SHALL show three icon-only controls that operate on the active Monaco editor instance:

1. **Fold** — collapses the deepest still-expanded fold nesting level across the whole file (one nesting step deeper; outer regions stay open).
2. **Unfold** — expands the deepest still-collapsed fold nesting level across the whole file (one nesting step shallower).
3. **Fold all** — collapses all fold regions (`editor.foldAll`).

Each control MUST expose a native `title` (and matching accessible name) with a short label. The Fold all control MUST also document the stock Monaco shortcut `Ctrl+K Ctrl+0`. Fold / Unfold MUST NOT claim cursor-local shortcuts that do not match this file-wide one-level behavior.

The application MUST NOT register additional keyboard bindings for these actions; operators may continue to use Monaco’s defaults and gutter chevrons independently of the buttons.

#### Scenario: Fold one nesting level from the header

- **WHEN** a file is open with expanded foldable regions at multiple nesting depths
- **AND** the operator activates the Fold header control
- **THEN** only the deepest expanded nesting level collapses across the active editor
- **AND** shallower expanded regions remain open

#### Scenario: Unfold one nesting level from the header

- **WHEN** a file is open with collapsed fold regions
- **AND** the operator activates the Unfold header control
- **THEN** only the deepest collapsed nesting level that is not hidden under a still-collapsed parent expands across the active editor

#### Scenario: Fold all from the header

- **WHEN** a file is open with foldable regions
- **AND** the operator activates the Fold all header control
- **THEN** all fold regions in the active editor collapse

#### Scenario: Fold all tooltip documents stock shortcut

- **WHEN** the operator inspects the Fold all control’s native tooltip
- **THEN** the tooltip includes the action label and `Ctrl+K Ctrl+0`

#### Scenario: No new app keybindings for fold

- **WHEN** the operator uses only the header fold controls (or stock Monaco shortcuts / gutter)
- **THEN** the application does not introduce new fold-specific key chords beyond Monaco’s built-ins
- **AND** the existing bare `Z` zoom shortcut outside the editor remains unchanged
