## Why

On a dense dependency graph it is hard to see which files belong to the same top-level area of the tree (`pages/*` vs `app/*` vs `shared/*`). Soft path-family glows behind visible nodes make folder families scannable without replacing tags, change overlay, or hop chrome. The feature must stay optional and quiet by default.

## What Changes

- Optional **Path glow** menu toggle (**off by default**)
- When enabled: soft background **group blobs** (hulls) and/or auras for path **families** derived from node ids (skip leading `src/`), covering **all** families and depths present on the canvas
- Family **hue** from alphabetically sorted unique families mapped onto a spaced palette (distinct hues)
- **Saturation decreases with path depth** within a family, with a floor so the deepest nodes stay distinguishable
- **Pulse** is off while idle; when a participating node becomes **active**, all participating nodes of that same family pulse slowly
- Glow membership: only **visible** (on-canvas after current filters/modes) and **active-highlight** participants — filtered-out / not-rendered nodes and **dimmed** (inactive under current highlight/focus) nodes **do not** join glow geometry or pulse
- Glow layer stays behind node cards and weaker than change/tag/hop accents
- Brief README / DocsModal note for the toggle

## Capabilities

### New Capabilities

- `path-family-glow`: Path-family background glow (palette, depth sat, hulls, pulse-on-active, menu toggle)

### Modified Capabilities

- _(none)_ — no requirement change to existing capabilities; deep-link for the toggle is out of scope for this change

## Impact

- `GraphView` / `FileNode` / layout overlay for hulls
- Menu panel in `App` for the toggle (local UI state; default false)
- CSS for glow/pulse and `prefers-reduced-motion`
- Docs: README, DocsModal
