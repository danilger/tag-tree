---
name: tag-tree
description: >-
  Integrate and operate the portable tag-tree dependency graph in a parent
  project. Use when adding .tag_tree, configuring tags, npm scripts,
  ai_subtree_nodes / collect-ai-subtree-nodes, /tag-tree-explain change-set
  comments, /tag-tree-note AI notes walkthroughs, or explaining // tag:* /
  Reload / file-base.
---

# tag-tree

Portable file-dependency graph (`// tag:*` filters + React Flow) that lives in
`.tag_tree/` inside a parent project. Repo:
https://github.com/danilger/tag-tree

## When to use

- User wants to add / set up tag-tree in a project
- Configure tags, `deps:tags` script, `--file-base`, Reload, isolate mode
- Fill `ai_subtree_nodes` (prefer `/tag-tree-ai-subtree` + collector script)
- Explain dirty git changes on the graph (prefer `/tag-tree-explain`)
- Author AI explanation notes / walkthroughs (prefer `/tag-tree-note`)
- Explain how tagging or the UI works

## Integrate into a parent project

1. If `<project>/.tag_tree` is missing, clone:
   ```bash
   git clone https://github.com/danilger/tag-tree.git .tag_tree
   ```
2. Add `.tag_tree/` to the parent `.gitignore` (the nested tool has its own git).
3. Install:
   ```bash
   cd .tag_tree && npm install
   ```
4. Add a script to the **parent** `package.json` (adapt paths):
   ```json
   "deps:tags": "npm --prefix .tag_tree start -- --root ../src --port 5174 --display-prefix src --file-base file:///D:/path/to/project/"
   ```
   - `--root` — folder to scan on the **server** filesystem
   - `--display-prefix` — prefix shown in UI paths (e.g. `src` → `src/app/main.tsx`)
   - `--file-base` — optional client `file://` URI for “Open in VS Code”
5. Edit `.tag_tree/config.json`:
   - `tags`: `tag`, `label`, `description`, optional `color` (HEX or CSS name)
   - optional `nodes`: `{ path, color?, textColor?, bgColor?, title?, description?,
     ai_subtree_nodes? }` for scanned files (`path` relative to `--root`)
6. Run: `npm run deps:tags` from the parent (or `npm start -- --root …` inside `.tag_tree`).

## Tags

- In source files, first non-empty line (`kebab-case` or `snake_case`):
  ```ts
  // tag:auth tag:slice_login
  ```
- Filter checkboxes come **only** from `config.json`. Tags present in files but
  missing from config still show on nodes, not in the menu — add them to config
  and Reload.
- Optional `tags[].color` tints the filter swatch / badge (and highlight border).
- Optional `nodes[]` overrides an existing node: `color` (border, wins over tag
  color), `textColor` (path/title text), `bgColor` (fill), `title` (primary
  label; path still shown underneath), `description` (hover tooltip under Title
  only), `ai_subtree_nodes` (string[] of paths for the dashed AI subtree button —
  curated logical deps when barrels hide edges). Does not create new graph nodes.
- **Prefer the Cursor command** `/tag-tree-ai-subtree [path]` (installed by
  `tag_tree init --agent cursor`) to populate `ai_subtree_nodes`. For JS/TS
  entries (`.ts` / `.tsx` / `.js` / `.jsx` / …) the command runs the shipped
  collector (see below), writes `config.json`, and tells the user to Reload.
  Use free-form skill help only for setup / explanation; for “fill AI subtree
  for this file”, run or follow that command.
- Install skill (+ Cursor commands) into a project:
  ```bash
  cd .tag_tree && npm run init -- --agent cursor   # or pi | both
  # or: node bin/tag-tree.mjs init --agent both
  ```

## AI subtree collector

Ships with the clone (not copied by `init`):
`.tag_tree/utils/collect-ai-subtree-nodes.mjs`

Walks static imports from an entry under `--root`, expands **named** barrel
re-exports only, skips bare packages, prints a JSON path array (graph node ids).
Does not include the entry itself.

```bash
# from parent project (scan root = src when deps:tags uses --root ../src)
node .tag_tree/utils/collect-ai-subtree-nodes.mjs --root src --entry pages/foo/ui/FooPage.tsx

# from inside .tag_tree
npm run collect-ai-subtree -- --root ../src --entry pages/foo/ui/FooPage.tsx
```

Optional `--graph` defaults to `.tag_tree/.generated/graph.json` and filters to
known node ids. Agents should prefer this script over hand-parsing imports when
the entry has a supported source extension.

## CLI flags (start / analyze)

| Flag | Meaning |
| --- | --- |
| `--root` | Scan directory on server disk (required) |
| `--port` | Vite port (default `5174`) |
| `--config` | Tag catalog JSON |
| `--display-prefix` | Path prefix for display / IDE links |
| `--file-base` | Client `file://` base for IDE links |

Browser cannot fetch `file://`. Preview content comes from `--root` via
`GET /api/file`. `POST /api/reload` rescans without restarting Vite.
`GET /api/changes` lists `changes/*.json`; `GET /api/changes/:id` loads one set.

## Agent changes (`changes/`)

Structural fields (`path`, `rows`, `prev_row`) MUST come from git export — do not
invent hunks by hand:

```bash
# from .tag_tree/
npm run export-change -- --root <scan-root> --id <name> [--label "…"] [--graph-only]
```

Agents may edit **only** `label`, `review` (`goal` + `order`),
`nodes[].comment` (narrative file summary — not an API inventory; see
`/tag-tree-explain`), and `nodes[].notes`
(`{ "line": <1-based current>, "text": "…" }`). Details:
`.tag_tree/changes/README.md`.

**Preferred workflow:** `/tag-tree-explain` (optional change-set name) — exports
dirty vs `HEAD` with `--graph-only`, then fills comments/notes/`review`. Any
agent may refine those fields later if the user asks. Also
`/tag-tree-ai-subtree` for curated dependency lists.

Selecting a set in the UI paints matching nodes with bright yellow + one-direction
hatching and opens Diff + comments on click (Comments select: Summary / Inline /
Both / Hide). **Review** (or Shift+R) opens the floating review guide when
`review` is set.

## AI notes (`notes/`)

Explanation walkthroughs (not git diffs). Prefer **`/tag-tree-note`** [optional
id] [topic…]: write `notes/<id>.json` with required **`label`** and **`guide`**
viewing map (`goal` + `order` of participating graph ids), plus optional
`nodes[].comment` / `nodes[].notes`. No `prev_row` / Diff. Details:
`.tag_tree/notes/README.md`.

UI: searchable **AI notes** control (pale blue) next to Review; selecting a note
clears Changes (and vice versa). Participating nodes get a pale-blue overlay.
**Notes** button or **Shift+N** opens the AI notes guide. Agents MAY embed
deep-link URLs to nodes (`file`, `focus`, tags, …) in `goal` / comments.

## UI (for agents helping users)

- Burger (top right) — show/hide menu
- Day / Night — theme (`localStorage`)
- Reload — rescan graph (+ refresh changes list)
- Mode select: Highlight / Only highlighted / Only changed / Only notes
  (`isolate` in URLs = Only highlighted; keeps active deps/AI subtree or tag
  matches; neither → empty canvas. `notes` = Only notes; empty if no note)
- Tags — searchable multi-select + selected chips (addition order); Any vs
  Intersection (OR / AND)
- Changes — dropdown of agent change sets
- AI notes — searchable single-select (pale blue; mutually exclusive with Changes)
- Documentation — in-app help
- Click node — Monaco preview (Diff when a change set is selected; comments
  without Diff when an AI note is selected)
- Circle on node (solid) — dependency subtree (outgoing imports); click again to clear
- Circle on node (dashed, if `ai_subtree_nodes`) — AI-curated subtree; mutually
  exclusive with the dependency circle
- Hover node — tooltip: Tags (`config.tags[].description`) and Title
  (`config.nodes[].title` / `description`; description tooltip-only)

## Deep links (shareable URL)

The UI reads and writes a query string on the app origin (no path router).
Present + valid params override `localStorage`; absent params keep storage /
defaults. After load, the address bar stays in sync via `history.replaceState`.

| Param | Values |
| --- | --- |
| `tags` | comma-separated ids (also repeated `tags=`) |
| `match` | `any` (default) \| `all` |
| `mode` | `highlight` (default) \| `isolate` (Only highlighted) \| `changed` \| `notes` (Only notes) |
| `change` | change-set id (`changes/<id>.json`) |
| `theme` | `light` (default) \| `dark` |
| `explorer` / `menu` / `split` / `zoom` / `review` | `0` \| `1` (also `true`/`false`) |
| `ratio` | split divider fraction (clamped) |
| `file` | graph node id (path) — opens viewer after graph load |
| `line` | 1-based line (with `file`) |
| `focus` | graph node id — locate/select on canvas |

Encode paths with `encodeURIComponent` when building links by hand.

Examples (replace origin/port as needed):

```text
http://localhost:5174/?tags=auth,ui&match=all&mode=isolate
http://localhost:5174/?file=shared%2Fauth%2Fstore.ts&line=42&split=1&focus=shared%2Fauth%2Fstore.ts
http://localhost:5174/?change=limit-applicant-new-request&review=1&mode=changed
```

Refresh installed skills after this template changes: `npm run init -- --agent cursor --force` (or `both`).

## Do not commit inside `.tag_tree`

Ignore `node_modules/`, `dist/`, `.generated/` (already in `.tag_tree/.gitignore`).
