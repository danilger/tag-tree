# file-viewer-vim-motions Specification

## Purpose

Read-only vim-like caret motions in the Monaco file viewer.

## Requirements

### Requirement: Word and line-edge motions

While the Monaco file viewer has read-only vim keys bound, pressing `w` without modifiers SHALL move the caret to the start of the next word. Pressing `b` SHALL move to the start of the previous word. Pressing `0` SHALL move to the first column of the current line. Pressing `$` SHALL move to the last column of the current line.

#### Scenario: w and b

- **WHEN** the caret is in the file viewer
- **AND** the user presses `w` or `b` without Ctrl/Meta/Alt/Shift
- **THEN** the caret moves by word start forward or backward respectively

#### Scenario: 0 and dollar

- **WHEN** the caret is in the file viewer
- **AND** the user presses `0` or `$` without Ctrl/Meta/Alt
- **THEN** the caret moves to the start or end of the current line respectively
