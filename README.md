# tag-tree

**tag-tree** helps you **review agent-written code** and **understand the features
agents build** — on a dependency graph of your project, not in a wall of diffs.

Agents export dirty changes into yellow **change sets** (`/tag-tree-explain`):
hatching on touched files, a Review guide (`Shift+R`) with a recommended reading
order, and file/line comments next to Monaco Diff. For “how does this feature
work?” they author pale-blue **AI notes** (`/tag-tree-note`): a viewing map of
participating nodes, narrative comments, and walkthroughs without requiring a
diff. Tags, isolate/highlight modes, and deep links keep large codebases
scannable while you review.

Under the hood it is a portable file-dependency graph with `// tag:*` filters,
rendered in [React Flow](https://reactflow.dev/). Click a node to preview the
file in Monaco (VS Code–style highlighting). Use **Split** next to **Zoom** for
a side-by-side layout (file left, graph right; drag the divider to resize).

Clone this folder into any project as `.tag_tree` and run it against that
project’s sources. It does **not** depend on skott or the host app’s build.
`changes/` and `notes/` stay local (only READMEs are tracked); `config.json`
ships empty so each project starts clean.

<img width="2560" height="1440" alt="image" src="https://github.com/user-attachments/assets/e791e0e0-ea0f-4f19-8c66-ba85346bd928" />

<img width="2560" height="1440" alt="image" src="https://github.com/user-attachments/assets/fde2f6f8-1123-4d39-8c68-5ff5b00e88c5" />


## Setup

```bash
cd .tag_tree
npm install
```

## Agent skills and commands

Install a project skill and workflow slash commands so agents know how to wire
tag-tree into the parent app:

```bash
# from parent project or from .tag_tree/
node .tag_tree/bin/tag-tree.mjs init --agent cursor
# or:
cd .tag_tree && npm run init -- --agent pi
# or both:
npm run init -- --agent both --force
```

| Flag | Meaning |
| --- | --- |
| `--agent` | `cursor`, `pi`, or `both` (prompt if omitted) |
| `--force` | overwrite existing skill / command / prompt files |
| `--cwd` | parent project root (auto-detected if omitted) |

Writes:

- Cursor skill → `.cursor/skills/tag-tree/SKILL.md`
- Cursor commands → `.cursor/commands/tag-tree-*.md` (`/tag-tree-ai-subtree`, `/tag-tree-explain`, `/tag-tree-note`)
- pi skill → `.pi/skills/tag-tree/SKILL.md` (also `/skill:tag-tree` when skill commands are enabled)
- pi prompt templates → `.pi/prompts/tag-tree-*.md` (same three `/tag-tree-*` names; project must be **trusted** in Pi)

### `/tag-tree-ai-subtree`

Slash command / Pi prompt (installed with `--agent cursor`, `pi`, or `both`). Use
it to fill `config.nodes[].ai_subtree_nodes` for one root file:

```text
/tag-tree-ai-subtree pages/foo/ui/FooPage.tsx
```

If the path is omitted, the agent asks for it. For `.ts` / `.tsx` (and other
JS/TS) entries it should run
[`utils/collect-ai-subtree-nodes.mjs`](utils/collect-ai-subtree-nodes.mjs)
(expands **named** barrel re-exports only), write the JSON list into
[`.tag_tree/config.json`](config.json), then you **Reload** the UI. Prefer this
command over free-form chat when the job is specifically “wire AI subtree for
this node” — keeps the skill from mixing setup talk with that workflow.

The collector ships with the clone (`init` does not copy it). From the parent
project or from `.tag_tree/`:

```bash
# parent project (when deps:tags uses --root ../src)
node .tag_tree/utils/collect-ai-subtree-nodes.mjs --root src --entry pages/foo/ui/FooPage.tsx

# inside .tag_tree
npm run collect-ai-subtree -- --root ../src --entry pages/foo/ui/FooPage.tsx
```

Stdout is a JSON array of paths relative to `--root` (graph node ids; entry
itself omitted). Optional `--graph` defaults to `.generated/graph.json` and
filters to known node ids.

### `/tag-tree-explain`

Slash command / Pi prompt that explains **dirty** changes (vs `HEAD`) on the graph:

```text
/tag-tree-explain
/tag-tree-explain auth-session-fix
```

Optional trailing token = change-set name (`changes/<id>.json`). If omitted, the
agent invents a short kebab-case id from the diff. The agent runs
`export-change` with `--graph-only`, then fills `comment` / `notes` / `review`.
See [`changes/README.md`](changes/README.md). Reinstall with `init --force` after
updating templates so the parent project gets the new command file.

### `/tag-tree-note`

Slash command / Pi prompt that authors an **AI notes** walkthrough (pale blue; not a
change set):

```text
/tag-tree-note
/tag-tree-note how-auth-works
/tag-tree-note how-auth-works how does session refresh work?
```

Optional trailing id = `notes/<id>.json`. Requires a human-readable **`label`**
and a **`guide`** viewing map (`goal` + `order` of participating graph paths).
May embed deep links to nodes. See [`notes/README.md`](notes/README.md).
Reinstall with `init --force` after updating templates.

## Config

[`config.json`](config.json) — tag catalog for the UI filter, plus optional per-file
overrides. The clone ships an empty `{ "tags": [], "nodes": [] }`; fill it for
your project. Agent change sets and AI notes under `changes/` / `notes/` stay
local (gitignores `*.json` there; only the READMEs are tracked).

```json
{
  "tags": [
    {
      "tag": "auth",
      "label": "Authentication",
      "description": "OIDC, session, route guards, auth API",
      "color": "#0969da"
    }
  ],
  "nodes": [
    {
      "path": "shared/auth/store.ts",
      "color": "red",
      "textColor": "#1a1a1a",
      "bgColor": "#ffe8e8",
      "title": "Auth store",
      "description": "Zustand session and role store"
    }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `tags[].color` | Optional. HEX (`#RGB` / `#RRGGBB`) or CSS name (`green`). Styles the filter swatch and badge; when highlighting, can tint the node border. Omitted → default theme colors. |
| `nodes` | Optional overrides for existing scanned files (does not add new graph nodes). |
| `nodes[].path` | Path relative to `--root` (same as the node id), not including `--display-prefix`. |
| `nodes[].color` | Optional node border color (overrides tag color). |
| `nodes[].textColor` | Optional text color for the path/title on the node. |
| `nodes[].bgColor` | Optional fill (background) color of the node. |
| `nodes[].title` | Optional primary label on the node; the path is still shown underneath in a smaller weight. |
| `nodes[].description` | Optional longer note; shown only in the hover tooltip under Title (not on the node body). |
| `nodes[].ai_subtree_nodes` | Optional list of paths (same form as `path`) for the AI-curated subtree button. Highlights those nodes plus the root; mutually exclusive with the dependency-subtree button. |

In source files, put tags on the first non-empty line (`kebab-case` or `snake_case`):

```ts
// tag:auth tag:slice_login
```

## Run

```bash
npm start -- --root ../src
# with IDE links (client machine paths) + display prefix:
npm start -- --root ../src --port 5174 --display-prefix src \
  --file-base file:///D:/projects/it_task/videohosting/frontend/
```

| Flag | Meaning |
| --- | --- |
| `--root` | Directory to scan on the **server** filesystem (required) |
| `--port` | Vite port (default `5174`) |
| `--config` | Tag catalog (default `./config.json`) |
| `--display-prefix` | Prefix joined to node ids in the UI (e.g. `src` → `src/app/main.tsx`) |
| `--file-base` | Client `file://` URI prefix for display / “Open in VS Code” (optional) |

**Important:** file contents in the modal are read from `--root` on the machine running Node. Browsers cannot fetch `file://` URLs. `--file-base` is only for showing the path and opening the file in a local IDE (e.g. when you view the UI via SSH tunnel on your PC).

Open `http://localhost:5174`. SSH tunnel example:

```bash
ssh -L 5174:localhost:5174 user@host
```

Rebuild graph only:

```bash
npm run analyze -- --root ../src --display-prefix src \
  --file-base file:///D:/projects/it_task/videohosting/frontend/
```

## How it works

1. Walks `--root` for `.ts` / `.tsx` / `.js` / …
2. Parses `tag:…` from the first non-empty line (`a-z`, `0-9`, `-`, `_`)
3. Collects static `import` / `export from` / `require` edges
4. Resolves relative paths and `tsconfig`/`jsconfig` `paths` aliases; skips npm packages
5. Serves `.generated/graph.json` to the React Flow UI
6. `GET /api/file?path=<nodeId>` returns file text for the Monaco modal
7. `POST /api/reload` re-runs analyze with the same CLI args (stored in `graph.json`)
8. `GET /api/changes` / `GET /api/changes/:id` serve agent change sets from [`changes/`](changes/)
9. `GET /api/notes` / `GET /api/notes/:id` serve AI notes from [`notes/`](notes/)

### Agent changes

Prefer **`/tag-tree-explain`** [optional name] so the agent exports dirty vs `HEAD`
(`--graph-only`) and fills comments/notes/`review`. Or export manually:

```bash
npm run export-change -- --root <scan-root> --id <name> [--graph-only]
```

Details and the agent contract (`comment` / `notes` / `review` / `label`) are in [`changes/README.md`](changes/README.md). Pick a set in the toolbar dropdown:

- Matching nodes get a bright yellow background with one-direction **hatching** (reserved for change sets; not used for tags/config/focus). Dark text for contrast. Normal border — no special green change chrome.
- **Review** (top-right, next to Search) or **Shift+R** opens a floating review guide when the set has `review` (`goal` + path `order`). Click a path to focus the node and open split view; the guide stays open.
- Opening a highlighted node shows agent comments and a Monaco Diff (`prev_row` vs current). Use the **Comments** select (Summary / Inline / Both / Hide) for file summary vs line notes. Line notes appear as view zones after the target lines in **Current only** and on the **modified** (right) pane of side-by-side. Use **Current only** for a single pane with changed lines highlighted; **Side-by-side** returns to the split diff. Without `prev_row`, the file opens with line decorations instead.

### AI notes

Prefer **`/tag-tree-note`** [optional id] [topic…] so the agent writes
`notes/<id>.json` with a required **`label`** and **`guide`** viewing map.
Details: [`notes/README.md`](notes/README.md).

- Searchable **AI notes** control (top-right, next to Review) — pick one note by
  label (search label/id); clear/none removes the overlay. Selecting a note
  clears the **Changes** selection (mutual exclusion) and vice versa.
- Participating nodes get a **pale-blue** hatch overlay (not change-set yellow).
- **Notes** (or **Shift+N**) opens a floating AI notes guide (`guide.goal` +
  path `order`). Click a path to focus and open split view; the guide stays open.
- Opening a participating file shows `comment` / line `notes` via Comments
  without requiring Diff / `prev_row`.

### Toolbar / menu

- **Burger** (top right) — show / hide the control menu (reload, mode, tags, docs)
- **Day / Night** — light or dark theme (saved in `localStorage`)
- **Explorer** — right-side folder tree of files currently on the canvas (see shortcuts below)
- **Reload** — rescan `--root` and refresh the graph without restarting Vite (also refreshes the changes list)
- **Mode** — select: **Highlight** (dim non-matching tags or outside an active subtree), **Only highlighted** (keep only currently highlighted nodes: active dependency/AI subtree, otherwise tag matches; with neither, the canvas is empty), **Only changed** (show only nodes from the selected agent change set; empty if none selected), **Only notes** (show only nodes from the selected AI note; empty if none selected)
- **Path glow** — off by default. Soft background blots group **visible, non-dimmed** nodes by top-level path family (skips leading `src/`; hues from sorted family names). Deeper paths are less saturated. Selecting a node slowly pulses that family. Dimmed / filtered-out nodes do not participate.
- **Tags** — searchable multi-select dropdown (A–Z; filter by label or id). Selected tags appear as chips below in addition order (dismiss one or **Clear all**). **Tags: Any / Intersection** — with multiple tags: Any = OR, Intersection = AND. Works with both Highlight and Only highlighted
- **Changes** — dropdown of `changes/*.json` agent change sets (`No changes` clears the hatching overlay)
- **AI notes** — searchable single-select next to Review (pale blue; clears Changes when set)
- **Documentation** — in-app help modal

### Deep links (URL query)

Shareable links use the query string on the app origin (e.g. `http://localhost:5174/?…`). Valid params override `localStorage` for that field; missing params keep stored / default values. The address bar updates as you work (`history.replaceState`).

| Param | Meaning |
| --- | --- |
| `tags` | Comma-separated tag ids (or repeated `tags=`) |
| `match` | `any` \| `all` |
| `mode` | `highlight` \| `isolate` (UI: Only highlighted) \| `changed` \| `notes` (UI: Only notes) |
| `change` | Agent change-set id |
| `theme` | `light` \| `dark` |
| `explorer` / `menu` / `split` / `zoom` / `review` | `0` \| `1` |
| `ratio` | Split divider fraction |
| `file` / `line` | Open node id in the viewer (optional 1-based line) |
| `focus` | Locate/select a node on the canvas |

Examples: `?tags=auth,ui&match=all&mode=isolate` · `?file=shared/auth/store.ts&line=42&split=1` · `?change=<id>&review=1&mode=changed`. Full agent contract: skill template `templates/agent-skill/SKILL.md` (re-install with `init --force`).

### Keyboard shortcuts

On macOS, `Ctrl` below is also `Cmd`. Keys use physical position (`h`/`j`/`k`/`l`) so they work on any keyboard layout.

**Browser Vim extensions** (e.g. Vimium, SurfingKeys, cVim for Chrome/Chromium): they capture `h`/`j`/`k`/`l`, digits, and often arrows before the page sees them — hop, Explorer nav, and pane focus will look “broken”. Disable the extension on this site (or globally while using tag-tree), or add an exclusion for the tag-tree origin.

#### Global / panes

| Shortcut | Action |
| --- | --- |
| `Ctrl+Shift+E` | Toggle Explorer |
| `Ctrl+←` / `Ctrl+→` | Focus canvas / Explorer (preferred; works on all layouts) |
| `Ctrl+Shift+H` / `Ctrl+Shift+L` | Same as arrows (use on Latin layouts — browsers steal plain `Ctrl+H`/`Ctrl+L`) |
| `Ctrl+H` / `Ctrl+L` | Same, when the browser does not intercept (often works on Cyrillic layout) |
| `Ctrl+F` | Search node by path (graph panel) |
| `Shift+R` | Toggle Review guide (when the selected change set has `review`) |
| `Shift+N` | Toggle AI notes guide (when a usable note is selected) |
| `Esc` | Context-dependent: close search / leave hop / return to Explorer after locate |

#### Canvas — select & hop between nodes

First select an **anchor** node (click with Ctrl, Search, or Explorer locate). Then hop along edges:

| Shortcut | Action |
| --- | --- |
| Click | Open file in Monaco |
| Enter | Open active node (anchor, or hop preview target). With a pending multi-digit hop number, Enter confirms the choice instead |
| `Ctrl+click` | Focus node only (anchor for hop; do not open) |
| `l` | Hop **forward** (outgoing imports / edges to the right) |
| `h` | Hop **backward** (incoming edges / to the left) |
| `0`…`9` | Choose edge by number (labels `0…n-1`, top→bottom). Multi-digit: type `10`, confirm with Enter or ~0.5s pause |
| `j` / `↓` | Next numbered neighbor (preview + 2s blink) |
| `k` / `↑` | Previous numbered neighbor (preview + 2s blink) |
| `l` / `h` again | While a neighbor is previewed: **commit** — that node becomes the new anchor |
| `Esc` | Preview → group view → back to original anchor |

**Hop flow:** `l`/`h` dims to the anchor + its neighbors and fits that group; edges get numbers. Pick a target (digit or `j`/`k`); the candidate blinks ~2s. Press the same `l`/`h` to land on it. One neighbor only: first `l`/`h` previews, second commits. No neighbors: no-op. Click any node while hopping cancels hop.

The current canvas anchor is mirrored in Explorer (selection/scroll only, without stealing keyboard focus).

#### Explorer

| Shortcut | Action |
| --- | --- |
| `h` `j` `k` `l` / arrows | Move like nvim (`h`/`←` collapse, `l`/`→` expand) |
| `gg` / `G` | Top / bottom of the tree |
| Click / Enter | Open file |
| `Ctrl+click` / `Ctrl+Enter` | Locate on graph: center, blink, set hop anchor; `Esc` returns focus to Explorer |

#### File viewer (Monaco, read-only vim)

| Shortcut | Action |
| --- | --- |
| `h` `j` `k` `l` | Move caret |
| `w` / `b` | Next / previous word |
| `0` / `$` | Start / end of line |
| `gg` / `G` | Top / bottom of file |
| `y` / `yy` / `Y` | Yank |
| `gd` | Go to definition via import graph (not a full TS language service) |
| Ctrl/⌘ + left-click | Same go-to-definition as `gd` at the click position |
| `Shift+H` / `Shift+L` | Back / forward in open-file history (updates graph node focus) |
| Hover identifier | JSDoc from definition site (same resolve as `gd`, including other files) |
| `Z` | Zoom / full-screen file |
| Split | Dock file left + graph right (drag the divider) |
| Current only / Side-by-side | When a change diff is available: one pane (current + highlights) ↔ split DiffEditor |

### Graph UI

Use **Search** (top-right) for a path like `shared/api/core.ts`. **Review** /
**AI notes** sit beside it (yellow vs pale blue; mutually exclusive). Solid
circle on a node = dependency subtree; dashed purple = AI subtree when
`ai_subtree_nodes` is set (only one focus at a time). Hover for tag/title
tooltips (`description` is tooltip-only). In split mode, clicking another node
updates the left pane. “Open in VS Code” needs `--file-base`.

<img width="2560" height="1271" alt="image" src="https://github.com/user-attachments/assets/9dbcf722-3890-4677-b558-fa6386930361" />
