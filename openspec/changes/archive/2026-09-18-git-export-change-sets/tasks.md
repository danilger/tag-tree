## 1. Export CLI scaffolding

- [x] 1.1 Add `scripts/export-change-from-git.mjs` with CLI flags `--root`, `--id`, optional `--label`, optional `--graph-only`; print usage on `--help`
- [x] 1.2 Resolve git toplevel via `git -C <root> rev-parse --show-toplevel`; exit non-zero with a clear error if not a work tree (no partial write)
- [x] 1.3 Register npm script `export-change` in `package.json`

## 2. Git → change-set nodes

- [x] 2.1 Collect paths differing from `HEAD` under `--root` (tracked diffs + untracked text files); map repo-relative paths to scan-root-relative node ids
- [x] 2.2 Skip paths outside `--root`, deleted files (warn on stderr), and binary/non-text files (warn); honor `--graph-only` when set
- [x] 2.3 For each remaining path emit one node: `prev_row` = full `git show HEAD:<repo-path>` (empty string if untracked/new), `rows` = `1…N` for current working-tree line count

## 3. Write + comment merge

- [x] 3.1 If `changes/<id>.json` exists, load prior `label` and `path → comment` map; merge comments onto matching new nodes; drop stale paths
- [x] 3.2 Write pretty-printed JSON to `changes/<id>.json` with `label` and `nodes` only after a successful full build

## 4. Docs

- [x] 4.1 Update `changes/README.md`: git export as source of `path`/`rows`/`prev_row`; agent may edit only `comment` (and optional `label`); document re-export merge behavior and example command
- [x] 4.2 Mention the export script in root `README.md` (and DocsModal if that surface lists change-set workflow)

## 5. Manual verification

- [x] 5.1 Run export against a dirty `--root`; confirm one node per file and DiffEditor matches `git diff HEAD -- <file>` in substance
- [x] 5.2 Re-export after editing a comment and changing a file; confirm comment preserved, `rows`/`prev_row` refreshed, and clean paths removed
