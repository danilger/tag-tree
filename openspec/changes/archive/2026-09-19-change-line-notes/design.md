## Context

Change-set nodes already support an optional file-level `comment`, normalized in `vite-file-api` / `ChangeHunk`, shown via `commentsForHunks` above the Monaco editor in `FileModal`. Git export (`scripts/export-change-from-git.mjs`) merges non-empty `comment` by `path` on re-export. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Extend the node schema with optional line notes (`notes: [{ line, text }]`) without breaking existing change JSON.
- Keep file `comment` as the summary field.
- Add a header `<select>` in the file viewer for Summary / Inline / Both.
- Preserve `comment` and `notes` across git re-export for matching paths.
- Document agent + operator usage.

**Non-Goals:**
- Editing comments/notes inside the UI (still authored in JSON / by agents).
- Threading, replies, or multi-author attribution.
- Anchoring notes to original/`prev_row` lines (current-file lines only in v1).
- Persisting display-mode preference across sessions (optional later).
- Full DiffEditor view-zone parity if Monaco DiffEditor makes it costly — Current-only is the primary inline target; side-by-side may show notes only on the modified pane or fall back to a compact list under the header when zones are impractical.

## Decisions

1. **Schema shape**  
   On each node: keep `comment?: string`. Add `notes?: { line: number; text: string }[]`. `line` is 1-based in **current** file content. Multiple notes on the same line are allowed; render stacked or joined with a separator.

2. **Normalization**  
   In `normalizeChangeHunks`: accept `notes` arrays; drop entries without positive integer `line` or non-empty string `text`; coerce `line` with `Math.floor`. Omit `notes` when empty after filter. Types: extend `ChangeHunk` with optional `notes`.

3. **Display modes**  
   Local state in `FileModal`, default **Both** when any notes or comment exist, else Summary is fine; simplest default: **Both**. Select labels: `Summary` | `Inline` | `Both`.  
   - Summary → existing summary block from `commentsForHunks` (file comments only).  
   - Inline → hide summary; show line notes in the editor.  
   - Both → summary + inline notes.

4. **Inline rendering**  
   Prefer Monaco **view zones** (or after-line widgets) on the Current-only `Editor` for notes whose `line` is in range. Reuse decoration lifecycle patterns already used for hunk highlights. For DiffEditor: attempt modified-side zones; if unreliable, show a small “line notes” list under the header when mode is Inline/Both and diff is side-by-side (document this fallback in README).

5. **Export merge**  
   Extend `export-change-from-git.mjs` existing comment merge: for each path still in the new export, copy previous `comment` and previous `notes` (filter valid). Do not invent notes from git.

6. **Helpers**  
   Add `notesForHunks(hunks)` (or filter on path-scoped hunks) in `changeDiff.ts` parallel to `commentsForHunks`. Summary block continues to use file comments only.

7. **Docs**  
   Update `changes/README.md`, root README / DocsModal change-set section: schema example, agent ownership (comments + notes), display select.

## Risks / Trade-offs

- **DiffEditor view zones** may be awkward → Current-only first-class; side-by-side fallback list is acceptable for v1.
- **Stale line numbers** after edits → notes may point past EOF; omit out-of-range (spec). Agents should refresh notes when regenerating explanations.
- **Duplicate notes per line** → allow; keep merge simple (replace entire notes array from previous file for that path, not merge by line with git — export doesn’t produce notes).

## Migration Plan

- Existing change JSON without `notes` remains valid.
- No data migration script required.
- Re-export continues to preserve authored fields when path matches.
