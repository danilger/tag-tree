## Context

See proposal.md — Why. The file viewer (`FileModal`) already hosts a read-only Monaco editor (and DiffEditor modified pane) with `editorRef` and default folding enabled. Header actions use `toolbar-btn` plus native `title` strings (e.g. Zoom documents `(Z)`). Custom vim keys in `monacoVimKeys.ts` ignore Ctrl/Meta/Alt, so Monaco’s stock fold shortcuts already work when the editor is focused. Bare `Z` outside Monaco toggles zoom and must stay untouched.

## Goals / Non-Goals

**Goals:**

- Three icon-only header buttons wired to Monaco `editor.fold`, `editor.unfold`, and `editor.foldAll` on the active editor.
- Native tooltips with short labels; Fold all documents `Ctrl+K Ctrl+0`. Fold / Unfold are file-wide one-level actions (no misleading cursor-local shortcut claims).
- Same behavior in modal and split-panel variants; side-by-side diff targets the modified editor (existing `editorRef`).
- `onMouseDown` preventDefault on fold buttons so the editor keeps focus/selection.

**Non-Goals:**

- New app-level keybindings (`zc` / `zo` / `zM`, Ctrl+Z chords, etc.).
- Unfold-all button (`editor.unfoldAll` / `Ctrl+K Ctrl+J`) — not requested.
- Changing Zoom (`Z`), vim motions, or Monaco fold defaults (`showFoldingControls`, strategy).
- Icon library dependency (no lucide/react-icons in the project).

## Decisions

### 1. File-wide one nesting level via FoldingController (deepest-first)

Fold collapses the deepest still-expanded regions; Unfold expands the deepest still-collapsed regions (vim-like `zm` / `zr`). Fold all uses `getAction('editor.foldAll').run()`. Rationale: outermost-first looked like “fold everything” on typical files (all top-level functions at once). Alternatives considered: stock cursor-local `editor.fold` — no-op off a foldable line; outermost-first file-wide — rejected after operator feedback.

### 2. No new keyboard bindings

Buttons only; tooltips advertise Monaco defaults. Rationale: user decision after exploring LazyVim `z…` — avoids conflict with Zoom and keeps vim surface small. Alternative (`zc`/`zo`/`zM`) deferred indefinitely.

### 3. Shortcut labels: Linux/Windows Ctrl forms

Document `Ctrl+…` in titles (primary deployment is Linux). Mac variants (`Cmd+Alt+[`, etc.) are not required in tooltips for this change. Alternative: platform-detect labels — skipped as unnecessary scope.

### 4. Icon presentation without a new dependency

Compact unicode or small inline SVG inside `toolbar-btn` (e.g. fold / unfold / fold-all glyphs), with `title` and `aria-label` carrying the full text. Match existing header density; optional CSS for square icon buttons in `.modal-actions`.

### 5. Guard when editor is missing

If `editorRef` is null (loading / error / no file), buttons MAY be disabled or no-op. Prefer `disabled` when no mounted editor so the chrome stays honest.

### 6. Focus before trigger (optional nicety)

Calling `focus()` on the editor before `trigger` keeps caret/fold target predictable after clicking the header. Prefer this over leaving focus on the button.

## Risks / Trade-offs

- **[Risk] Fold / Unfold no-op when caret is not on a foldable line** → Acceptable (same as stock Monaco); Fold all still works.
- **[Risk] Tooltip shortcuts wrong on macOS** → Documented as Linux/Windows Ctrl forms; Mac users still have gutter + Monaco defaults.
- **[Risk] Header crowding on narrow widths** → Icon-only keeps footprint small; existing responsive `.label-short` patterns for other buttons remain.

## Migration Plan

Ship with the frontend; no data migration. Rollback: remove the three buttons and related CSS.
