---
name: "/tag-tree-ai-subtree"
id: "tag-tree-ai-subtree"
category: "Workflow"
description: "Fill config.nodes[].ai_subtree_nodes for a root file (logical deps through barrels)"
---

# tag-tree: AI subtree nodes

Fill or refresh `ai_subtree_nodes` on one entry in `.tag_tree/config.json` so the dashed purple button on that graph node highlights **logical** dependencies (including through `index` re-exports), not only direct import edges.

**Scope**: edit `.tag_tree/config.json` only (and mention Reload). Do not change application source unless the user explicitly asks.

**Input**: optional path after the command — node id relative to tag-tree `--root` (same as graph node id / `config.nodes[].path`, e.g. `pages/foo/ui/FooPage.tsx`). Strip a leading `src/` if the user pasted a display path and `--root` is already `src`.

---

## Steps

1. **Resolve the root path**

   - If the user provided a path argument, normalize it (`\` → `/`, strip leading `./`).
   - If missing, ask (open-ended):
     > Which file should get `ai_subtree_nodes`? Give the path relative to the tag-tree scan root (e.g. `shared/auth/store.ts`).

   Do not proceed without a concrete path.

2. **Confirm the file exists under `--root`**

   Prefer reading `.tag_tree/.generated/graph.json` and checking `nodes[].id`, or reading the file on disk under the scan root from the parent `deps:tags` / `npm start -- --root …` script. If the path is wrong, ask once to correct it.

3. **Discover logical dependencies “down the tree”**

   Goal: the dashed-button highlight should surface deps the user “loses” on
   the graph because of barrels/re-exports. Do **not** include the root path
   itself in `ai_subtree_nodes` (the UI already adds the root to the highlight
   set). Prefer unique paths that match graph node ids.

   **Prefer the shipped collector when the entry is a JS/TS source file**
   (extension `.ts` / `.tsx` / `.js` / `.jsx` / `.mts` / `.cts` / `.mjs` /
   `.cjs`). From the **parent** project root run:

   ```bash
   node .tag_tree/utils/collect-ai-subtree-nodes.mjs --root <scan-root> --entry <path>
   ```

   Example (when `deps:tags` uses `--root ../src`):

   ```bash
   node .tag_tree/utils/collect-ai-subtree-nodes.mjs --root src --entry pages/foo/ui/FooPage.tsx
   ```

   Stdout is a JSON array of paths — use that list as `ai_subtree_nodes`.
   Optional `--graph .tag_tree/.generated/graph.json` filters to known node ids
   (default path is already `.tag_tree/.generated/graph.json`).

   **Manual fallback** (non-source entry, script missing, or you need to
   override): walk imports yourself — follow `import` / `export … from` inside
   the scan root; when the target is a barrel (`index.*`), expand only the
   **named** re-exports that were imported (not the whole barrel API); skip
   third-party / bare packages; recurse.

4. **Write `.tag_tree/config.json`**

   - Ensure `nodes` is an array.
   - Find an object with `"path"` equal to the root (after normalize), or create one.
   - Set `"ai_subtree_nodes"` to the sorted unique list of discovered paths (overwrite previous list for this path).
   - Keep other fields on that node (`title`, `color`, …) intact.
   - Valid JSON; preserve readable formatting if the file is already pretty-printed.

5. **Report**

   - Summarize: root path, how many entries written, brief note if barrels were expanded.
   - Tell the user to **Reload** in the tag-tree UI (or restart `deps:tags`) so `configNodes` refresh.
   - Remind: solid circle = graph BFS; dashed circle = this curated list; only one focus mode at a time.

## Do not

- Invent paths that are not under the scan root.
- Replace the whole `config.json` or wipe unrelated `nodes` / `tags`.
- Commit unless the user asks.
