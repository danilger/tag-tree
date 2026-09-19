## Why

Change-set review shows a single file-level AI comment above the editor. Operators want line-anchored explanations next to highlighted changes, while keeping the file summary. How comments appear should be controllable from the file viewer chrome.

## What Changes

- Keep existing per-file `nodes[].comment` (summary above the editor when that mode is selected).
- Add optional per-line notes on each change node, e.g. `nodes[].notes: [{ "line": <1-based>, "text": "…" }]`, authorable by agents (structural fields still from git export).
- In the file viewer header, add a **select** for comment display mode, for example:
  - **Summary** — file `comment` block only (current-style)
  - **Inline** — line `notes` shown next to code (e.g. Monaco view zones / margin); file summary hidden
  - **Both** — summary block and inline notes
- Document schema + agent contract + display select in `changes/README` and viewer docs.
- On git re-export, preserve non-empty file `comment` and line `notes` for matching paths (merge policy for notes by `path` + `line`).

Assumptions: notes attach to **current-file** 1-based line numbers; inline rendering targets Current-only and the modified side of side-by-side where practical; v1 may prioritize Current-only for view zones if DiffEditor limits apply (recorded in design).

## Capabilities

### New Capabilities

- `change-notes`: File-level and line-level change-set comments, and viewer controls for how they are displayed.

### Modified Capabilities

- (none — `change-sets` remains export/structure; notes UI is a separate capability. If archive later merges concerns, that can be revisited.)

## Impact

- Schema / types: `ChangeHunk` (or node type) + API normalize in `vite-file-api.ts`
- `scripts/export-change-from-git.mjs` comment/notes merge on re-export
- `src/FileModal.tsx` header select + rendering (summary vs inline)
- Docs: `changes/README.md`, README, DocsModal
