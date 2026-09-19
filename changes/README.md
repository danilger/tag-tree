# Agent change sets

JSON files here (any name ending in `.json`) appear in the toolbar **Changes** dropdown without a full graph rescan.

## Preferred: export from git

Structural fields must come from git, not from an agent inventing hunks:

```bash
npm run export-change -- --root <scan-root> --id <name> [--label "UI label"] [--graph-only]
# or: node scripts/export-change-from-git.mjs --root … --id …
```

- Baseline: `git diff HEAD` (working tree + index vs `HEAD`), plus untracked text files under `--root`.
- One `nodes[]` entry per changed file; `prev_row` is the full `HEAD` blob (empty for new/untracked files); `rows` is `1…N` for the current file.
- Re-running the same `--id` refreshes `path` / `rows` / `prev_row` and **keeps** existing non-empty `comment` values, valid `notes`, and `review` for the file. Paths no longer in the diff are dropped.
- Deleted and binary files are skipped (warning on stderr). Use `--graph-only` to keep only paths present in `.generated/graph.json` (recommended when painting the overlay).

### Agent contract

Agents may edit **only**:

- `label` (optional)
- `review` (optional set-level guide: `{ "goal": "…", "order": ["path", …] }`)
- `nodes[].comment` (file-level **narrative**: role → story → main point → flow to other files in the set; not an API inventory — see `/tag-tree-explain`)
- `nodes[].notes` (optional line notes: `{ "line": <1-based current file>, "text": "…" }`)

Agents must **not** author or rewrite `path`, `rows`, or `prev_row`. Re-run the export script when the working tree changes. Refresh `notes` line numbers when the current file shifts.

**Preferred:** `/tag-tree-explain` [optional change-set name] (Cursor command or
Pi prompt) — exports dirty vs `HEAD` with `--graph-only`, then fills
`comment` / `notes` / `review` (language of the user’s latest message). Any
agent may later refine those fields when the user asks. Reinstall via
`tag_tree init --agent both --force` (or `cursor` / `pi`) after updating
`.tag_tree` so the workflows are available in the parent project.

## Schema

```json
{
  "label": "Auth fix 11:00",
  "review": {
    "goal": "Limit ticket creation from session ticket_limit. Start with shared/auth/store.ts — it owns the limit flag other UI reads.",
    "order": [
      "shared/auth/store.ts",
      "pages/new-request/ui/NewRequestPage.tsx",
      "widgets/sidebar/ui/Sidebar.tsx"
    ]
  },
  "nodes": [
    {
      "path": "shared/auth/store.ts",
      "comment": "Why this change was made",
      "notes": [
        { "line": 42, "text": "Guard against stale session" }
      ],
      "rows": [1, 2, 3],
      "prev_row": "…full previous file text…\n"
    }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `label` | Optional UI label (default: file name without `.json`) |
| `review.goal` | High-level change purpose; should say why `order[0]` is the review entry point |
| `review.order` | Recommended review path sequence (graph node ids) |
| `nodes[].path` | Node id = path relative to `--root` |
| `nodes[].comment` | Narrative file summary for reviewers (role → story → main point → links to other paths; agent-authored) |
| `nodes[].notes` | Optional line notes anchored to **current** file 1-based lines |
| `nodes[].rows` | 1-based line numbers in the **current** file (export uses `1…N`) |
| `nodes[].prev_row` | Previous text for that range (feeds Monaco DiffEditor; export uses full `HEAD` content) |

Selecting a set paints matching nodes with a bright yellow background and one-direction **hatching** (this fill is reserved for change-set display; text stays dark for contrast). Click a node to see comments + diff.

### Review guide on the canvas

When `review` is present, the yellow **Review** button (next to Search) opens a floating guide (`Shift+R` toggles). Click a path in the list to focus the node and open the file in **split** view; the guide stays open. Without `review`, the button stays disabled.

### Comment display in the file viewer

In the file viewer header, use the **Comments** select:

- **Summary** — file `comment` block only
- **Inline** — line `notes` next to code (Monaco view zones after the line, in **Current only** and on the modified side of side-by-side)
- **Both** — summary and line notes together
- **Hide** — hide all AI comments (file summary and line notes)
