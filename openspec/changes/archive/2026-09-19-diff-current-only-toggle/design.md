## Context

See proposal.md — Why. `FileModal` already branches on `showDiff` (DiffEditor with `original` + `modified`, `renderSideBySide: true`) vs single `Editor` with optional `change-line-highlight` decorations when hunks exist but `buildOriginalContent` returns null. Header already has Split / Zoom / comment visibility controls.

## Goals / Non-Goals

**Goals:**

- Toolbar toggle: side-by-side ↔ current-only (modified + decorations)
- Reuse existing decoration CSS and hunk `from`/`to` ranges
- Hide or no-op the toggle when DiffEditor is not available

**Non-Goals:**

- Monaco inline `renderSideBySide: false` stacked diff
- Showing original-only pane
- Persisting the preference across sessions (v1: per-open local state is enough; optional localStorage later)
- Changing how `original` is built from git/`prev_row`

## Decisions

### 1. Current-only = modified file + decorations (not Monaco left pane)

**Choice:** Single `Editor` with `file.content` and the same decoration mapping as today’s `showDecorated` path.

**Why:** Matches “изменённый код” + highlights; Monaco’s left pane is HEAD/original.

### 2. Local React state in FileModal

**Choice:** `diffView: 'side-by-side' | 'current'` default `'side-by-side'`; reset when `file.path` / open cycle changes.

**Why:** Minimal; no App-level plumbing.

### 3. Control placement and label

**Choice:** Header button next to existing toolbar actions, only when `showDiff` would be true (original available). Labels e.g. `Current` / `Side-by-side` or a single pressed toggle “Current only”.

**Why:** Discoverable beside Split/Zoom.

### 4. Vim / focus

**Choice:** On mount of either editor, keep existing `bindReadonlyVimKeys` on the focused editor (modified side today; sole editor in current-only).

## Risks / Trade-offs

- **[Risk] Whole-file git export marks all lines as hunks** → Current-only may highlight the entire file; acceptable given existing export schema; still better than dual pane for reading.
- **[Trade-off] No inline word-level diff in current-only** → Side-by-side remains available via toggle.

## Open Questions

None material — assumption “current/modified, not original-only” is recorded in the proposal.
