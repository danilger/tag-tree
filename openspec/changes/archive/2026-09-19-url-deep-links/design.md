## Context

See proposal.md — Why. The SPA has no router today; theme and layout chrome already use localStorage (`tag-tree-theme`, `tag-tree-layout`). Graph loads asynchronously; `openNode` / `locateNode` need the graph (and laid-out nodes) before applying `file` / `focus`.

## Goals / Non-Goals

**Goals:**

- Query-string parse + apply on load; serialize on UI change via `replaceState`
- Full menu filter set + layout prefs + file/focus/review deep links
- Skill (+ short README/Docs) contract for agents

**Non-Goals:**

- React Router / path-based routes (`/file/...`)
- Encoding React Flow camera pan/zoom in the URL
- Encoding Review panel x/y/w/h geometry
- Persisting deep-link history in the browser back stack as separate “pages” (replaceState is enough; pushState optional later)

## Decisions

### Query string, not path segments

**Choice:** `?tags=…&file=…` on the Vite app origin.

**Why:** Node ids contain `/`; no router dependency; works with current Vite SPA.

**Alternative considered:** Hash (`#tags=…`) — reserve if static hosting strips query; not needed for Vite `npm start`.

### Param names (stable contract)

| Param | Values |
| --- | --- |
| `tags` | comma-separated ids; also accept repeated `tags=` |
| `match` | `any` \| `all` |
| `mode` | `highlight` \| `isolate` \| `changed` |
| `change` | change-set id |
| `theme` | `light` \| `dark` |
| `explorer` / `menu` / `split` / `zoom` / `review` | `0` \| `1` (also accept `true`/`false`) |
| `ratio` | float, clamped to existing SPLIT_MIN/MAX |
| `file` | node id (decoded path) |
| `line` | positive int |
| `focus` | node id |

Omit empty defaults from serialized URL where practical (shorter links).

### Precedence

**Choice:** Present + valid query → overrides storage; absent → storage/default.

**Why:** Share links must win; everyday reloads without query keep localStorage behavior.

### Apply timing

**Choice:** Apply filter/chrome immediately from URL; run `file` / `focus` / `review` in an effect after `graph` is loaded (and for focus, after layout/nodes exist — retry once via `locateNode` or short timeout if needed).

**Why:** Avoid racing empty graph.

### Module shape

**Choice:** Small helper e.g. `src/urlState.ts` — `parseDeepLink(search)`, `buildDeepLink(state)`, used from `App`.

**Why:** Keeps App thinner; easy to unit-smoke and document against the skill table.

### Two-way sync

**Choice:** `history.replaceState` when deep-linkable state changes; skip writing during the initial URL→state hydrate to avoid loops.

**Why:** Address bar always shareable without polluting history.

## Risks / Trade-offs

- **[Risk] Long tag lists / noisy URLs** → Mitigation: omit defaults; comma-join tags.
- **[Risk] Stale `change` id** → Mitigation: ignore unknown id like empty selection.
- **[Risk] `focus` before nodes mounted** → Mitigation: apply after graph+layout; soft retry.
- **[Risk] Skill drift after init** → Mitigation: document `--force`; ship template update in this change.

## Open Questions

None — camera URL encoding deferred as non-goal.
