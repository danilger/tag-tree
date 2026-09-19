## Why

When reviewing a change-set file in side-by-side DiffEditor, operators often want a wider view of the **current** (modified) code with changed lines still highlighted, without keeping the original pane open. Today that single-pane decorated view only appears when `prev_row` is missing; with a full diff there is no toggle.

## What Changes

- Add a header control (visible when a side-by-side change diff is shown) that toggles between:
  - **Side-by-side** — existing DiffEditor (original | modified)
  - **Current only** — single Editor with the modified file content and the same green line/margin decorations used for hunk highlighting
- Default remains side-by-side when a reconstructable original exists.
- Document the control in README / DocsModal briefly.

Assumption from exploration: “left part with changed code” means the **modified/current** file (Monaco’s right pane), not the HEAD/original pane.

## Capabilities

### New Capabilities

- `file-diff-view`: How the file viewer presents change-set diffs (side-by-side vs current-only with highlights).

### Modified Capabilities

- (none)

## Impact

- `src/FileModal.tsx` (toggle state, DiffEditor vs decorated Editor)
- Existing CSS `.change-line-highlight` / `.change-line-margin` (reuse)
- Docs: README / DocsModal file-viewer shortcuts or Changes section
