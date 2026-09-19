## Why

Agent-authored `changes/*.json` invents `rows` and `prev_row`, so Monaco diffs diverge from real `git diff`. Operators need change overlays whose file lists and patch content come from git, with agents only adding meaning via comments.

## What Changes

- Add a deterministic CLI script that exports a change set JSON from `git diff` against `HEAD` (working tree + index vs `HEAD`).
- Script writes `path`, `rows`, and `prev_row` only; one node per changed file; optional empty `comment`.
- On re-run against an existing file, preserve existing per-file `comment` values (merge by path).
- Document the agent contract: agents may edit only `nodes[].comment` (and optionally `label`); never invent paths/hunks.
- Keep the existing tag-tree viewer (`/api/changes`, DiffEditor, green overlay) — no requirement to live-query git at view time.

## Capabilities

### New Capabilities

- `change-sets`: Deterministic git-backed export of agent change-set JSON (`changes/*.json`), including HEAD baseline, one comment per file, and comment-preserving re-export.

### Modified Capabilities

- (none — no main specs exist yet)

## Impact

- New script under `scripts/` (and optional npm script entry).
- Docs: `changes/README.md`, possibly root README / DocsModal mention.
- Existing change JSON samples remain valid; new exports replace the agent-as-author workflow for structural fields.
- Requires a git repo containing the analyze `--root` (or an explicit repo/cwd flag); no new runtime dependencies beyond the system `git` binary.
