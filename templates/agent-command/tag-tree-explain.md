---
name: "/tag-tree-explain"
id: "tag-tree-explain"
category: "Workflow"
description: "Explain dirty git changes on the tag-tree (export + comments + review guide)"
---

# tag-tree: explain dirty changes

Export the current **dirty** working tree (vs `HEAD`) into a tag-tree change set, then add file-level and line-level explanations **and** a set-level **review** guide so operators can walk the change on the graph (yellow hatch, Review panel) and in the file viewer (Diff + Comments select).

**Scope**: run git export under `.tag_tree`, then edit only `label` / `review` / `nodes[].comment` / `nodes[].notes` in `changes/<id>.json`. Do not invent `path`, `rows`, or `prev_row`. Do not change application source unless the user explicitly asks. **No git commit/ref argument** — only uncommitted changes.

**Input**: optional change-set **name** after the command (becomes `--id`, e.g. `/tag-tree-explain auth-session-fix`). Normalize to lowercase kebab-case `[a-z0-9-]+`. If missing, invent a short id (2–4 words) from the meaning of the diff and use it as `--id` / `label`.

**Language**: write `comment`, `notes`, and `review.goal` in the language of the operator’s latest user message. If the invoke is only the slash line, use the previous substantive user message’s language.

This command is the **initial** author of explanations and `review`. Later, any agent may refine `review` / comments / notes when the user asks.

---

## Steps

1. **Resolve scan `--root`**

   Same as other tag-tree workflows: read the parent `deps:tags` / `npm start -- --root …` script, or `.tag_tree/.generated/graph.json` (`root` field), so export matches the running graph.

2. **Resolve change-set id**

   - If the user passed a name → sanitize to kebab-case id.
   - Else invent from the dirty diff themes (e.g. `fix-login-redirect`).
   - Prefer that id as `--label` unless the user clearly wanted a different display label.

3. **Export structure from git (graph-only)**

   From the **`.tag_tree`** directory (or via the parent script that wraps it):

   ```bash
   npm run export-change -- --root <scan-root> --id <id> --graph-only --label "<label>"
   ```

   This writes/refreshes `.tag_tree/changes/<id>.json` with `path` / `rows` / `prev_row` from `git diff HEAD` (plus untracked text under `--root`), filtered to graph node ids. Prior `comment` / `notes` / `review` are preserved by export — overwrite them with fresh text in the next steps.

4. **Empty graph overlap**

   - If the exported `nodes` array is empty → stop. Tell the user nothing dirty overlaps the graph (wrong `--root`, clean tree, or changes only outside the graph). Do **not** invent non-graph paths for overlay comments. Optionally suggest checking `--root` or temporarily exporting without `--graph-only` only if they ask — this command itself stays graph-only.

5. **Author file explanations**

   For each exported node write **`comment`** and **`notes`**. They are different layers:

   | Field | Job |
   | --- | --- |
   | `comment` | Narrative for a reviewer who opens this file first time in the change |
   | `notes` | Short, specific notes on symbols/lines |

   ### `comment` — narrative (required shape)

   Write **connected prose** (about 4–8 sentences / ~80–120 words), **not** a comma-separated API inventory. Follow this order:

   1. **Role** — what this file is *for* in this change (“Этот файл — …”).
   2. **Story** — what happens here now (behavior), without listing every export.
   3. **Main point** — one clear sentence: “Главное здесь — …”.
   4. **Flow** — where data/control comes from and which other paths in **this** change set read or call it next (name 1–3 files, not every helper).

   **Do not** start with a catalog of fields/functions (`поле X, сеттер Y, хелпер Z`). Put symbol detail in `notes`. Mentions of API names in `comment` only when the story needs them.

   **Bad** (inventory — avoid):

   > Центр модели лимита: поле ticketLimit, сеттер, refreshMeProfile, константа сообщения, хелперы isTicketCreateLimitExhausted / notifyTicketCreateLimitReached. Остальные файлы только читают store.

   **Good** (narrative — prefer):

   > Этот файл — источник правды по дневному лимиту создания заявок: сюда попадает остаток лимита из профиля и отсюда же UI узнаёт, что создавать заявку больше нельзя. Здесь лимит обновляется при логине и refresh профиля и собираются общие текст и toast, чтобы экраны не дублировали формулировки. Главное здесь — единая модель лимита и проверка/уведомление об исчерпании; без этого остальные экраны не решают, можно ли создавать заявку. Дальше лимит только читают NewRequest, сайдбар и палитра — они сами его не считают.

   Use the operator’s language (see Language above). Same four beats if writing in English.

   ### `notes`

   `{ "line": <1-based current file>, "text": "…" }` on functions, classes, variables, exports, and other key fragments touched by the diff. More specific than the file `comment`; refer to that code. A handful of anchors per file — not one note per every diff line.

   On re-run for the same id: **replace** prior `comment` / `notes` with a fresh explanation (do not append duplicates).

6. **Author the review guide**

   Set top-level:

   ```json
   "review": {
     "goal": "…",
     "order": ["path/first.ts", "path/second.ts"]
   }
   ```

   - **`order`**: all (or the important) exported paths in an agent-chosen sequence that is **logical for human review** — not git order or alphabetical unless that happens to be best. Think dependencies, entry points, then UI/callers.
   - **`goal`**: high-level purpose of the whole change (1–3 sentences). **Briefly explain why review should start with `order[0]`** (e.g. “start with the auth store — it owns ticket_limit that everything else reads”).

   Replace any prior `review` on re-run.

7. **Report**

   - Summarize: id, node count, that comments + review are graph-scoped dirty-vs-HEAD.
   - Tell the user to **Reload** in the tag-tree UI (refreshes the Changes list) and pick the set in the **Changes** dropdown.
   - Remind: canvas = yellow + hatching; **Review** button (or **Shift+R**) opens the floating review guide; file viewer = Diff / Current only; **Comments** select = Summary / Inline / Both / Hide.

## Do not

- Pass or invent a git commit/ref to explain historical commits.
- Hand-author `rows` or `prev_row`.
- Add comments for paths not in the export (non-graph).
- Commit unless the user asks.
