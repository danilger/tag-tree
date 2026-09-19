## Why

Operators often need an AI-authored walkthrough of how an area of the codebase works (e.g. “explain auth”) that is **not** a git change review. Reusing yellow change sets conflates “what changed” with “how it works.” A separate notes layer with a Review-like guide UI (pale blue) lets agents publish structured explanations with a required viewing map of participating files.

## What Changes

- New on-disk folder `notes/*.json` (separate from `changes/`) with required human-readable `label`, required viewing map (`guide.goal` + `guide.order`), and per-file `comment` / line `notes`
- API to list/load notes (`GET /api/notes`, `GET /api/notes/:id`)
- Canvas chrome next to Review: searchable **single-select** “AI notes” dropdown (label-visible); **Shift+N** toggles the notes guide when a usable note is selected
- Dedicated floating notes panel (not the Review panel), pale-blue visual language for control, panel, and node overlay
- Selecting a note **mutually excludes** the agent change-set layer (and vice versa): only one overlay layer active
- File viewer shows note `comment` / line notes without requiring Diff / `prev_row`
- Cursor command **`/tag-tree-note`** (+ skill/docs): how to author notes; remind agents they MAY include shareable deep-link URLs to specific nodes (`file` / `focus` / tags, etc.) when that helps the user; require a viewing map of participating paths in every note
- Brief README / DocsModal / changes-or-notes README

## Capabilities

### New Capabilities

- `ai-notes`: Notes storage, API, dropdown, pale-blue guide panel/overlay, mutual exclusion with changes, agent command

### Modified Capabilities

- _(none)_ — Review / change-set requirements stay as-is; notes are a parallel capability

## Impact

- New `notes/` + `notes/README.md`; Vite file API routes
- `App` / `GraphView` / new `AiNotesPanel` (or similar); pale-blue CSS distinct from change yellow
- Templates: Cursor command + skill update via `init --force`
- FileModal comment UI may accept note hunks without diff
