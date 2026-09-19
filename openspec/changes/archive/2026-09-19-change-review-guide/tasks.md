## 1. Schema and persistence

- [x] 1.1 Add `review?: { goal: string; order: string[] }` to `ChangeSet` types and normalize on load
- [x] 1.2 Preserve `review` in `export-change-from-git.mjs` on re-export
- [x] 1.3 Document `review` in `changes/README.md` (agent contract + example)

## 2. Review UI

- [x] 2.1 Add yellow Review button beside Search; enabled only when selected set has usable `review`
- [x] 2.2 Implement floating guide panel: yellow surface, goal + path list, drag, resize, scroll
- [x] 2.3 Remember panel position/size for the session; default top-right
- [x] 2.4 Toggle via button and Shift+R (ignore editable/Monaco targets)
- [x] 2.5 Path click: locate node + open file in split; keep guide open

## 3. Agent packaging

- [x] 3.1 Update `/tag-tree-explain` command to author `review.goal` + `review.order` (justify first path in goal)
- [x] 3.2 Update agent skill change-set section for `review` and Review UI
- [x] 3.3 Brief README / DocsModal notes for Review + Shift+R

## 4. Verification

- [x] 4.1 Manual: set with `review` → button on, Shift+R, drag/resize, path → split, guide stays
- [x] 4.2 Manual: set without `review` → button disabled
- [x] 4.3 Re-export keeps `review`
