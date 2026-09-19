## 1. URL state helper

- [x] 1.1 Add `parseDeepLink` / `buildDeepLink` (or equivalent) covering tags, match, mode, change, theme, explorer, menu, split, zoom, ratio, file, line, focus, review
- [x] 1.2 Validate/clamp values; ignore invalid params without throwing

## 2. App wiring

- [x] 2.1 Hydrate App state from `location.search` on load (URL overrides localStorage when present)
- [x] 2.2 After graph ready: apply `file`/`line` via openNode, `focus` via locateNode, `review=1` when guide exists
- [x] 2.3 Sync deep-linkable state back to the URL with `replaceState` (skip hydrate loop)

## 3. Docs for agents and humans

- [x] 3.1 Document query contract + examples in `templates/agent-skill/SKILL.md`
- [x] 3.2 Short reference in README and/or DocsModal
