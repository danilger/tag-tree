## Context

Change sets already support git export (`export-change-from-git.mjs`), file `comment`, line `notes`, and UI display modes. Prior OpenSpec work for those behaviors is archived. Agents still get outdated guidance from `templates/agent-skill/SKILL.md` (hand-written hunks, green border). Cursor already installs `/tag-tree-ai-subtree` via `bin/tag-tree.mjs`. See proposal.md for motivation. Locked product choices: dirty-only; optional change **name** (not commit); always `--graph-only`; comment language = latest user message; skill updated in this change.

## Goals / Non-Goals

**Goals:**
- Ship `/tag-tree-explain` as an agent procedure (command markdown), not new runtime APIs.
- Teach naming: user-provided id/label vs agent-invented kebab-case from diff meaning.
- Align skill + init so parent projects receive both command and correct change-set contract.
- Encode quality bar for `comment` (overview + cross-file) vs `notes` (symbol/fragment specific).

**Non-Goals:**
- Commit/ref explain; export `--base`/`--commit`.
- Changing Monaco/graph runtime.
- Auto-running export without an agent (no new npm script required beyond documenting existing `export-change`).
- Persisting language preference outside the chat turn.

## Decisions

1. **Command shape**  
   `/tag-tree-explain` optional trailing token = change-set **name** (becomes `--id`, sanitized to `[a-z0-9-]+`). No commit args. Mirror structure/tone of `tag-tree-ai-subtree.md` (frontmatter, Steps, Scope).

2. **Agent steps (command body)**  
   - Resolve `--root` from parent scripts / graph config (same patterns as subtree command).  
   - Resolve id: user token if present, else invent from diff themes (2–4 kebab words).  
   - `npm run export-change -- --root <root> --id <id> --graph-only` (and `--label` when useful).  
   - If zero nodes → stop with message.  
   - Read diff / files; write `comment` + `notes` per exported node; replace texts on re-run.  
   - Remind operator: Reload / pick Changes dropdown.  
   - Language: latest user message.

3. **Notes heuristic (documented in command, not code)**  
   Prefer anchors on changed functions/classes/exported symbols/key branches; avoid one note per every diff line; keep notes denser than noise (roughly a handful per file unless huge).

4. **Skill update**  
   Replace Agent changes section: git export owns structure; agent owns `label`/`comment`/`notes`; UI yellow+hatch; link to `/tag-tree-explain` and `changes/README.md`.

5. **Init wiring**  
   Add second entry in `CURSOR_COMMAND_TARGETS` pointing at `templates/agent-command/tag-tree-explain.md` → `.cursor/commands/tag-tree-explain.md`. Pi has no Cursor commands path (unchanged).

6. **Docs**  
   Short pointer in `changes/README.md` under agent contract: preferred invoke `/tag-tree-explain`.

## Risks / Trade-offs

- **Stale parent installs** — templates alone do not update existing parents until `init --force`; call out in tasks/README.
- **Bad invented ids** — acceptable; user can re-run with an explicit name.
- **Language ambiguity** — “latest user message” may be only the slash command in English while prior chat was Russian; command should say: prefer substantive latest user prose; if the invoke is only the slash line, use the previous user message’s language.
- **Agent non-compliance** — specs are contracts on shipped command/skill text; enforcement is prompt quality, not CI.

## Migration Plan

- No data migration.
- Existing `changes/*.json` unchanged.
- Operators reinstall Cursor artifacts with `tag_tree init --agent cursor --force` (or `both`) from an updated `.tag_tree`.
