## Context

See proposal.md — Why. Node ids are paths relative to `--root` (often without a `src/` prefix; when `src` is the first segment it must be skipped). `layoutGraph` already marks `dimmed` / `highlighted` and can omit nodes under isolate/changed. `NODE_HEIGHT` is 80 — useful as aura scale. No path-glow exists today; menu chrome lives in `App`.

## Goals / Non-Goals

**Goals:**

- Toggle off by default; soft family hulls + depth sat + pulse-on-active for participating nodes
- Deterministic sorted-family → spaced hue palette; skip leading `src`
- Participants = on-canvas and not dimmed

**Non-Goals:**

- Deep-link / localStorage for the toggle (session UI state is enough for v1)
- Configurable skip-list beyond `src` / per-project palette in `config.json` (can follow later)
- True merged “one polygon for whole repo” across distant clusters — prefer per-proximity cluster hulls
- New npm dependencies for hull math if a small convex-hull helper in-repo suffices

## Decisions

### Family key

**Choice:** Split path on `/`; while first segment is `src`, shift; family = next segment; if none, family = `_root` or the filename stem — prefer `_` + full id only when no directory segment remains.

**Why:** Matches “skip src or sense is lost”; works for `pages/…`, `app/…`, flat files.

### Palette

**Choice:** Unique families from **participating** nodes → sort A–Z → `hue = (i / N) * 360 + HUE_OFFSET` (offset ~20–40° to avoid change-overlay yellow band if practical). Fixed S/L baselines; per-node S reduced by depth.

**Depth:** `depth = number of segments after skipped src` (file counts). `maxD` = max depth in that family among participating nodes.  
`sat = lerp(satMax, satMin, (depth-1)/max(maxD-1,1))` with `satMin ≈ 0.28`, `satMax ≈ 0.72`.

### Participation

**Choice:** Build glow inputs from layout nodes where `!data.dimmed` (and thus present in the current React Flow node list). Filtered-out nodes never appear in layout → excluded automatically.

**Active for pulse:** Same notion as hop/canvas anchor — `selected` / `onAnchorChange` / Ctrl-focus path already tracked in `GraphView`. When `activeId`’s family is F, set `pulseFamily = F` for participating nodes with family F.

### Hull rendering

**Choice:** Overlay SVG (or absolute div layer) in the graph pane, **under** nodes: for each family, cluster participating node centers (e.g. simple distance threshold or one hull per connected proximity group), compute convex hull, inflate ~`NODE_HEIGHT`, fill with family color at low alpha + soft blur/feGaussianBlur. Optional per-node `::before` aura using same HSL with depth sat.

**Why:** Soft “blot” grouping without React Flow parent nodes / `parentId` reflow.

**Alternative:** Only per-node box-shadow — rejected as primary (operator asked for group blot).

### Toggle state

**Choice:** `useState(false)` in `App`, pass `pathGlow` into `GraphView`. No persistence v1.

### Motion

**Choice:** CSS animation ~5s opacity breathe on `.path-glow-pulse`; `@media (prefers-reduced-motion: reduce) { animation: none }`.

## Risks / Trade-offs

- **[Risk] Dense graphs: overlapping family blots** → Mitigation: low alpha; cluster split when centers are far
- **[Risk] Palette reshuffle when a new family appears** → Mitigation: accept for v1; document; optional later stable hash hybrid
- **[Risk] Perf with many hulls** → Mitigation: recompute hulls only when layout positions / participants / toggle change; debounce on pan if needed (hulls in flow coords move with viewport via RF transform)
- **[Risk] Dimmed definition edge cases under hop** → Mitigation: hop dimming already sets `dimmed`; those nodes drop out of glow until hop ends

## Migration Plan

None. Feature off by default; no data migration.

## Open Questions

None for planning — active = existing canvas/hop selection; skip = `src` only; no URL sync in v1.
