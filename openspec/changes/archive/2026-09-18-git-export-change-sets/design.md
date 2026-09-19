## Context

See proposal.md — Why. Today `changes/*.json` is hand/agent-written; the viewer (`normalizeChangeHunks`, `buildOriginalContent`, Monaco DiffEditor) already expects `path` / `rows` / `prev_row` / optional `comment`. This design adds a git→JSON exporter and a comment-merge policy; the runtime UI stays snapshot-based (no live git at view time).

## Goals / Non-Goals

**Goals:**

- Deterministic structural fields from `git diff HEAD`
- One node per file; one comment slot per file
- Re-export merges comments by `path`
- Clear agent contract in docs
- Compatible with existing `/api/changes` and DiffEditor without requiring UI changes for v1

**Non-Goals:**

- Live git queries from the Vite API / browser
- Comparing against `main` / PR base (HEAD only for v1; other bases can be a later flag)
- Per-hunk comments
- Perfect support for deleted files in the modal (v1: skip deleted or warn; viewer still needs an on-disk file)
- Generating or validating agent comment text automatically

## Decisions

### 1. Snapshot JSON, not live git in the viewer

**Choice:** Export once into `changes/<id>.json`; UI keeps reading JSON.

**Why:** Matches current architecture; diffs stay reviewable offline; agent comments stay attached to a frozen structural snapshot until re-export.

**Alternative considered:** `GET /api/git-diff` at click time — always fresh, but loses attached comments unless a parallel comment store exists, and couples the UI to git availability.

### 2. Baseline = `HEAD` (working tree + index)

**Choice:** Equivalent to `git diff HEAD` (and include untracked files under the scan root as added files with empty `prev_row`).

**Why:** Matches what developers mean by “what I changed locally.”

**Alternative considered:** `main...HEAD` for branch scope — deferred; optional `--base` later without changing the comment-merge model.

### 3. One node per file (aggregate hunks)

**Choice:** Collapse all hunks for a path into one `nodes[]` entry.

**How `rows` / `prev_row` stay truthful for the existing splicer:**

- Prefer building `prev_row` / line ranges by applying each hunk bottom-to-top the same way `buildOriginalContent` expects: either emit one contiguous `from`…`to` covering all touched new-side lines with a `prev_row` that is the HEAD text for that span, **or** (cleaner) compute full-file original = `git show HEAD:path` and set a single range that replaces the whole file (`rows` = all lines of current file, `prev_row` = full HEAD content).

**Preferred approach for correctness:** whole-file original from `git show HEAD:<path>` vs current working-tree bytes, with `rows` listing every line of the current file (or `1…N`). DiffEditor then shows a true full-file diff identical in substance to `git diff HEAD -- path`. Slightly larger JSON, zero hunk-boundary bugs.

**Alternative considered:** Encode multiple hunks as multiple nodes — rejected; user wants one comment per file.

### 4. Comment merge on re-export

**Choice:** Load existing JSON if present; map `path → comment`; after building new nodes from git, copy comment when path matches and previous comment was non-empty; do not invent comments for new paths; drop paths no longer in the diff.

**Why:** Agents can annotate once; operators can refresh structural fields without wiping meaning.

### 5. Path mapping

**Choice:** Resolve git paths relative to repo root, then rewrite to scan-root-relative node ids (same normalization as analyze / `normalizeConfigPath`). Optionally filter to ids present in `.generated/graph.json` via `--graph-only` flag (default **off** for v1 so export works before analyze; docs recommend graph-only when painting the overlay).

**Why:** Graph overlay only paints known nodes; including non-graph files still helps if the operator opens them later or expands scope — but defaulting to all under `--root` avoids silent drops.

### 6. CLI shape

**Choice:** `node scripts/export-change-from-git.mjs` with flags:

- `--root <scan-root>` (required; same meaning as analyze)
- `--id <name>` → writes `changes/<id>.json`
- `--label <text>` optional (default: id; on re-export keep existing label unless `--label` passed)
- `--cwd` / repo discovery: `git -C <root> rev-parse --show-toplevel`

Register npm script `export-change` for convenience.

### 7. Agent workflow

**Choice:** Docs-only contract for v1 (no separate merge-comments binary). Agents edit comments in place after export; re-export preserves them.

**Alternative considered:** Strict merge CLI that only accepts `{path, comment}[]` — nice hardening; defer unless agents keep rewriting structure.

## Risks / Trade-offs

- **[Risk] Snapshot drifts after further edits** → Mitigation: re-run export; comments merge by path.
- **[Risk] Whole-file `prev_row` makes large JSON for big files** → Mitigation: acceptable for source files; skip/warn on huge or binary files.
- **[Risk] Deleted files** → Mitigation: omit from export with stderr warning (viewer cannot load missing path).
- **[Risk] Path prefix mismatch (monorepo)** → Mitigation: require `--root`; map via repo-relative → root-relative; fail clearly if root not inside work tree.
- **[Trade-off] Full-file diff vs hunk-only highlight** → Full-file is correct vs git; line decorations that used sparse `rows` become whole-file — acceptable given DiffEditor is the primary UX.

## Migration Plan

1. Ship script + docs; leave existing sample `changes/*.json` as-is (still valid).
2. Operators regenerate sets via the script; agents only fill comments.
3. No schema **BREAKING** change for the viewer; optional future cleanup of hand-written inaccurate samples.

## Open Questions

None material for v1 — baseline HEAD, one comment per file, and comment-preserving re-export are fixed.
