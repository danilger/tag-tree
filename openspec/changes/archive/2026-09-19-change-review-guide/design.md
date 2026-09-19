## Context

Change sets already support `label`, per-file `comment`/`notes`, git export with merge of authored fields, canvas Search (`NodeSearchPanel` top-right), and App-level split file viewing. `/tag-tree-explain` authors comments/notes for dirty vs HEAD. See proposal.md for motivation. Locked choices: field name `review`; Review disabled (not hidden) without guide; command initially writes `review`, any agent may refine on request; agent picks review `order` and justifies the first path in `goal`; Shift+R is free; remember panel geometry for the session.

## Goals / Non-Goals

**Goals:**
- Schema + API + export preserve for `review`
- Review button + floating panel + Shift+R + path → locate + split
- Docs and `/tag-tree-explain` (+ skill) updated

**Non-Goals:**
- Auto-generating `review` in the export script (still agent-authored)
- Blocking modal / changing Monaco comment modes
- Persisting panel geometry across browser reloads (session only)
- Commit-based explain (still dirty-only)

## Decisions

1. **Schema** — Top-level `review?: { goal: string; order: string[] }`. Normalize: trim goal; keep order entries that are non-empty normalized paths; drop `review` if goal empty or order empty after filter.

2. **Types / API** — Extend `ChangeSet` in `types.ts`; parse in change-load path (`vite-file-api` or equivalent). Export `loadPrior` stores/restores `review` alongside comments/notes.

3. **UI placement** — Extend top-right panel next to Search (same `Panel` or adjacent control group). Button class reuses change yellow (`#ffe566` / `#1a1a1a`), pressed/open state clear.

4. **Floating panel** — New component (e.g. `ReviewGuidePanel`): `position: fixed`, header drag, corner resize, `overflow: auto`, z-index above graph but coordinated with split (does not block file pane interaction unnecessarily). Default top-right; `sessionStorage` or React state retained for the SPA session for `{x,y,w,h}`.

5. **Open path** — Callback into App: `locateNode(path)` via GraphView handle + `setSplitView(true)` + existing open-file flow. Do not close guide.

6. **Hotkey** — `Shift+KeyR` at window level with ignore when target is input/textarea/select/contenteditable/Monaco (and `.node-search` input).

7. **Explain command** — Add step after comments/notes: write `review.goal` + `review.order`; goal must mention why `order[0]` comes first; order = logical review sequence over exported paths.

8. **Agent contract docs** — `changes/README` + skill: agents may edit `review`; explain is the default producer.

## Risks / Trade-offs

- **Stale order paths** after re-export drops files — UI should skip locate for missing nodes; agent should refresh `review` when re-explaining.
- **z-index / pointer** — floating panel must not permanently cover Close on file pane; default size modest.
- **Dual ownership of geometry** — session-only avoids preference sprawl.

## Migration Plan

- Existing JSON without `review` remains valid; Review stays disabled until an agent/explain adds it.
- Reinstall Cursor command/skill via `tag_tree init --force` after template updates.
