# AI notes

JSON files here (any name ending in `.json`) appear in the canvas **AI notes**
dropdown. They are **not** git change sets — use `changes/` for dirty-diff
reviews (yellow). Notes are pale-blue explain/walkthrough guides.

## Preferred: `/tag-tree-note`

Cursor command (after `tag_tree init --agent cursor`):

```text
/tag-tree-note [optional-id] …
```

Agents create or update `notes/<id>.json` for a user question (e.g. “how does
auth work?”): narrative file comments, line notes, and a required **viewing
map** (`guide.order`).

## Schema

```json
{
  "label": "How authentication works",
  "guide": {
    "goal": "Trace session → store → UI gates. Start at shared/auth/store.ts.",
    "order": [
      "shared/auth/store.ts",
      "pages/login/ui/LoginPage.tsx"
    ]
  },
  "nodes": [
    {
      "path": "shared/auth/store.ts",
      "comment": "Narrative explanation for this file…",
      "notes": [{ "line": 42, "text": "Anchor note on a key line" }]
    }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `label` | **Required** human-readable name in the AI notes dropdown |
| `guide.goal` | High-level explanation; SHOULD say why `order[0]` is the entry point |
| `guide.order` | **Required** viewing map — participating graph node ids in read order |
| `nodes[].path` | Graph node id (path relative to `--root`) |
| `nodes[].comment` | Optional file-level narrative |
| `nodes[].notes` | Optional `{ "line": <1-based>, "text": "…" }` on the current file |

Do **not** require `rows` / `prev_row` (no Diff). Paths in `guide.order` and
`nodes[].path` SHOULD be graph ids. Agents MAY embed shareable deep links
(`?file=…&focus=…&split=1`, tags, etc.) in `goal` / comments when helpful.

Selecting a note clears the **Changes** selection (mutual exclusion) and paints
participating nodes pale blue. **Mode: Only notes** shows only those paths
(empty if no note selected). **Shift+N** toggles the AI notes guide panel.
