## 1. Header fold controls

- [x] 1.1 In `FileModal` header `.modal-actions`, add three icon-only buttons: Fold, Unfold, Fold all (unicode or inline SVG; `toolbar-btn` + `aria-label`)
- [x] 1.2 Wire clicks to `editorRef.current`: focus editor then `trigger` `editor.fold` / `editor.unfold` / `editor.foldAll`; disable or no-op when no mounted editor
- [x] 1.3 Set native `title` (and matching accessible name) with label + stock shortcuts: `Ctrl+Shift+[`, `Ctrl+Shift+]`, `Ctrl+K Ctrl+0`
- [x] 1.4 Add minimal CSS for compact icon buttons in `.modal-actions` if needed so they fit with Zoom / Split / Close

## 2. Docs and verification

- [x] 2.1 Optionally mention the three fold header controls (and that shortcuts are Monaco defaults) in `DocsModal`
- [x] 2.2 Manually verify modal + split + side-by-side diff: fold / unfold at caret, fold all, tooltips; confirm no new keybindings and Zoom `Z` unchanged
