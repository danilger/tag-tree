## 1. Schema and API

- [x] 1.1 Extend `ChangeHunk` with optional `notes: { line: number; text: string }[]`
- [x] 1.2 Normalize `notes` in `vite-file-api` (positive line, non-empty text; omit empty arrays)
- [x] 1.3 Add helper to collect notes for path-scoped hunks (e.g. in `changeDiff.ts`)

## 2. File viewer UI

- [x] 2.1 Add header `<select>` for display mode: Summary / Inline / Both
- [x] 2.2 Gate file-summary block on Summary or Both; hide on Inline
- [x] 2.3 Render in-range line notes as Monaco view zones (or equivalent) on Current-only editor for Inline/Both
- [x] 2.4 Side-by-side: modified-side zones or documented header fallback list for notes

## 3. Git export merge

- [x] 3.1 Preserve `notes` (and existing `comment`) by path when re-exporting change JSON

## 4. Documentation

- [x] 4.1 Document `comment`, `notes`, agent authorship, and display select in `changes/README.md` (and DocsModal / README as needed)

## 5. Verification

- [x] 5.1 Manual check: Summary / Inline / Both with comment-only, notes-only, and both present
- [x] 5.2 Confirm re-export keeps comment + notes for an unchanged path
