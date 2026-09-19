---
name: "/tag-tree-note"
id: "tag-tree-note"
category: "Workflow"
description: "Author an AI notes walkthrough on the tag-tree (label + viewing map + comments)"
---

# tag-tree: AI notes walkthrough

Create or update a **`notes/<id>.json`** walkthrough so operators can pick it in
the canvas **AI notes** dropdown (pale blue, mutually exclusive with yellow
**Changes** / Review). Notes explain how something works — they are **not**
git change sets and must not use Diff / `prev_row`.

**Scope**: write only under `.tag_tree/notes/`. Do not invent graph paths that
are not node ids. Do not change application source unless the user explicitly
asks.

**Input**: optional note **id** after the command (e.g.
`/tag-tree-note how-auth-works`), then optional topic prose. Normalize the id to
lowercase kebab-case `[a-z0-9-]+`. If missing, invent a short id (2–4 words)
from the user’s question.

**Language**: write `label`, `guide.goal`, `comment`, and `notes` in the language
of the operator’s latest user message. If the invoke is only the slash line, use
the previous substantive user message’s language.

---

## Steps

1. **Resolve scan `--root` and graph ids**

   Same as other tag-tree workflows: parent `deps:tags` / `npm start -- --root …`,
   or `.tag_tree/.generated/graph.json` (`root` + `nodes[].id`). All paths in
   `guide.order` and `nodes[].path` MUST be graph node ids relative to that root.

2. **Resolve note id + label**

   - If the user passed an id → sanitize to kebab-case.
   - Else invent from the question (e.g. `how-auth-works`).
   - Set **`label`** to a clear, scannable title (required; shown in the
     dropdown). Prefer a human sentence fragment over the raw id.

3. **Build the viewing map (required)**

   Choose the participating files (typically 3–12) and order them for reading.
   Write:

   ```json
   "guide": {
     "goal": "… why start at order[0]; what the walkthrough answers …",
     "order": ["path/a.ts", "path/b.tsx", "…"]
   }
   ```

   - `goal` and `order` MUST be non-empty or the note will not load in the UI.
   - Every participating path SHOULD appear in `order`.
   - Prefer starting at the best entry-point file.

4. **Author file entries**

   For each path in the map, add a `nodes[]` entry:

   | Field | Job |
   | --- | --- |
   | `path` | Graph node id |
   | `comment` | Connected prose (role → story → main point → flow); not an API inventory |
   | `notes` | Optional `{ "line": <1-based>, "text": "…" }` anchors |

   Do **not** add `rows` / `prev_row`. Opening a note node shows Comments without
   requiring Diff.

5. **Optional deep links**

   When it helps the user jump into the app, embed shareable tag-tree URLs in
   `guide.goal` or a `comment`, e.g.
   `http://localhost:5174/?file=shared/auth/store.ts&focus=shared/auth/store.ts&split=1`
   (adjust origin/port). Params: `file`, `focus`, `tags`, `match`, `mode`,
   `split`, etc. — see README / skill Deep links. There is no `note=` param in
   v1; deep links target nodes.

6. **Write the file**

   Save `.tag_tree/notes/<id>.json`. Tell the operator to **Reload** (or refresh)
   if the dropdown is already open, then pick the note by **label**. **Shift+N**
   toggles the AI notes guide; selecting a note clears any active change set.

## Schema reminder

```json
{
  "label": "How authentication works",
  "guide": {
    "goal": "…",
    "order": ["shared/auth/store.ts"]
  },
  "nodes": [
    {
      "path": "shared/auth/store.ts",
      "comment": "…",
      "notes": [{ "line": 42, "text": "…" }]
    }
  ]
}
```

Details: `.tag_tree/notes/README.md`.
