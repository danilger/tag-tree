## Context

See proposal.md. Motions live in `bindReadonlyVimKeys` (KeyCode-based for non-Latin layouts).

## Goals / Non-Goals

**Goals:**

- `w` → start of next word; `b` → start of previous word (Monaco word commands)
- `0` → column 1 of current line; `$` → last column of current line
- Clear pending `g`/`y` prefixes on these motions

**Non-Goals:**

- `W`/`B` WORD (whitespace-only) variants
- `e` / `ge` / `^` / counts
- Insert mode

## Decisions

### Word motion

**Choice:** Monaco `cursorWordStartRight` / `cursorWordStartLeft`.

**Why:** Closest built-in to vim `w`/`b` without a custom tokenizer.

### Line edges

**Choice:** Set position to column 1 for `0`; line max column for `$` (via model), then reveal.

**Why:** Matches vim `0`/`$` on the current line; KeyCode Digit0 and `$` key (Digit4+Shift or `key === '$'`).

## Risks / Trade-offs

- **[Risk] `$` on some layouts** → Mitigation: accept both Shift+Digit4 and `event.key === '$'`.

## Open Questions

None.
