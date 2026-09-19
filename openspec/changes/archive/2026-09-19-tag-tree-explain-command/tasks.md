## 1. Command template

- [x] 1.1 Add `templates/agent-command/tag-tree-explain.md` with frontmatter, dirty-only scope, optional name arg, `--graph-only` export steps, comment/notes quality rules, language rule, Reload/Changes reminder
- [x] 1.2 Document empty-graph and re-run (replace texts) behavior in the command steps

## 2. Init + skill

- [x] 2.1 Register the explain command in `bin/tag-tree.mjs` `CURSOR_COMMAND_TARGETS`
- [x] 2.2 Update `templates/agent-skill/SKILL.md` Agent changes section: git export, `comment`/`notes`/`label`, yellow hatch, pointer to `/tag-tree-explain`

## 3. Docs

- [x] 3.1 Point `changes/README.md` (and README if needed) at `/tag-tree-explain` as the preferred explain path

## 4. Verification

- [x] 4.1 Confirm `tag_tree init --help` / dry read of targets lists both Cursor commands
- [x] 4.2 Sanity-read command + skill against the locked decisions (no commit arg; name; graph-only; language)
