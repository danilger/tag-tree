## Why

Agents and operators cannot share a reproducible tag-tree view: menu filters, multi-tag selection, open file mode, and canvas focus exist only in React state / localStorage. Deep links via URL query params let agents hand someone (or themselves) an exact UI snapshot.

## What Changes

- Encode and restore top-menu settings via URL query: multi-tag selection, tag match mode (any/all), view mode (highlight/isolate/changed), selected change set, theme, explorer open, menu open, and split/zoom/ratio layout prefs.
- Support opening a file from the URL (path, optional line, split vs modal) with the same viewer modes as the UI.
- Support focusing/locating a graph node from the URL without requiring a separate manual Search step.
- Optionally open the Review guide when a usable review exists (`review=1`).
- Keep URL in sync when the user changes relevant UI state (`replaceState`) so the address bar stays a valid share link.
- On load: explicit query params override localStorage defaults; omitted params keep existing storage/defaults.
- Document the query contract in the agent skill template (and briefly in README / DocsModal) so agents know how to compose links.

## Capabilities

### New Capabilities

- `url-deep-links`: URL query deep links for menu filters, file open, and canvas node focus; agent-facing link composition docs.

### Modified Capabilities

- (none)

## Impact

- `src/App.tsx` (and possibly a small URL parse/serialize helper module)
- `GraphView.locateNode` / `openNode` wiring after graph load
- `templates/agent-skill/SKILL.md` (+ note that `tag_tree init --force` refreshes installed skills)
- README / DocsModal short reference
