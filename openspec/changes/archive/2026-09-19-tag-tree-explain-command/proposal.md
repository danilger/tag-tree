## Why

Operators can already export a git-backed change set and attach file `comment` plus line `notes`, but agents still lack a clear Cursor command that turns “explain my dirty work on the tag-tree” into that workflow. The installed skill still describes an outdated hand-written JSON path, so agents do not reliably produce graph overlays with cross-file summaries and keyed line notes.

## What Changes

- Add a Cursor slash command `/tag-tree-explain` (template + `tag_tree init` install) that instructs the agent to:
  1. Export dirty vs `HEAD` via `npm run export-change` with `--graph-only`
  2. Use an optional change-set **name** from the user, or invent a short kebab-case id from the diff meaning
  3. Fill `nodes[].comment` (file-level overview + links to related files in the set) and `nodes[].notes` on key symbols/fragments
  4. Write those texts in the language of the user’s latest message
- Update the agent skill (`templates/agent-skill/SKILL.md`) so change-set guidance matches git export + `comment`/`notes`/`label` and points at `/tag-tree-explain`
- Wire the new command into `bin/tag-tree.mjs` Cursor install targets (alongside `/tag-tree-ai-subtree`)
- Document the command briefly in `changes/README.md` / README as needed

**Out of scope:** commit/ref parameters; export `--commit` / snapshot API; runtime UI changes (overlay, Diff, Summary/Inline/Both already exist).

## Capabilities

### New Capabilities

- `agent-explain`: Cursor command and agent docs that produce a graph-scoped change set with file and line explanations for the current dirty tree.

### Modified Capabilities

- (none — runtime `change-sets` / `change-notes` behavior unchanged; this change is agent packaging)

## Impact

- `templates/agent-command/tag-tree-explain.md` (new)
- `templates/agent-skill/SKILL.md` (Agent changes section)
- `bin/tag-tree.mjs` (install second Cursor command)
- Optional: `changes/README.md`, root README
- Parent projects only pick this up after `tag_tree init --force` (or equivalent reinstall)
