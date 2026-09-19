## Purpose

Deterministic export of tag-tree agent change-set JSON from git, so file lists and diffs match `git diff` while agents only supply per-file comments.

## ADDED Requirements

### Requirement: Export change set from git HEAD

The system SHALL provide a CLI that writes a `changes/<id>.json` change set whose structural fields (`path`, `rows`, `prev_row`) are derived only from `git diff` against `HEAD` (working tree and index compared to `HEAD`), not invented by an agent.

#### Scenario: Export dirty working tree

- **WHEN** the operator runs the export CLI with an output id and a scan root that lives inside a git repository
- **THEN** the CLI writes JSON under `changes/` whose `nodes` cover text files that differ from `HEAD` within that scan root
- **AND** each node's `path` is the path relative to the scan root (graph node id form)
- **AND** each node's `rows` and `prev_row` are taken from the git diff for that file so that reconstructing the original via the existing viewer yields a diff consistent with `git show HEAD:<path>` vs the working-tree file

#### Scenario: Not a git repository

- **WHEN** the scan root is not inside a git work tree
- **THEN** the CLI fails with a non-zero exit and an error message that mentions git
- **AND** it does not write a partial change-set file

### Requirement: One node and one comment slot per file

The export SHALL emit at most one `nodes[]` entry per changed file path. That entry MAY carry a single `comment` string describing the whole-file change. The export MUST NOT require per-hunk comments.

#### Scenario: Multi-hunk file

- **WHEN** a single file has multiple non-contiguous hunks in `git diff HEAD`
- **THEN** the exported JSON contains exactly one node for that file
- **AND** `rows` lists all changed line numbers on the new side (or an equivalent contiguous range covering those lines as required by the existing change-set schema)
- **AND** `prev_row` holds the concatenated previous-side text needed for the viewer to rebuild the HEAD version of the replaced ranges

### Requirement: Preserve comments on re-export

When the export CLI overwrites an existing change-set file, it MUST preserve non-empty `comment` values from the previous file for nodes whose `path` still appears in the new export. Paths removed from the diff MUST be dropped. New paths MUST appear without inventing comments (omit `comment` or leave it empty).

#### Scenario: Re-export keeps comments

- **WHEN** `changes/foo.json` already has a node for `a.ts` with a non-empty `comment`
- **AND** the operator re-exports to the same id and `a.ts` is still dirty vs `HEAD`
- **THEN** the new file still has that same `comment` on the `a.ts` node
- **AND** updated `rows` / `prev_row` reflect the current git diff

#### Scenario: Re-export drops stale paths

- **WHEN** the previous file had a node for `b.ts` with a comment
- **AND** `b.ts` no longer differs from `HEAD`
- **THEN** the re-exported JSON does not include `b.ts`

### Requirement: Agent edits comments only

Documentation for change sets MUST state that agents MAY set or update only `label` and `nodes[].comment`, and MUST NOT author or rewrite `path`, `rows`, or `prev_row`. Structural fields MUST be produced by the git export CLI.

#### Scenario: Documented agent contract

- **WHEN** an operator reads `changes/README.md` (or equivalent docs updated by this change)
- **THEN** the docs describe the git export CLI as the source of structural fields
- **AND** state that agents only add or edit comments (and optionally the change-set label)

### Requirement: Filter to paths under scan root

The export SHALL include only paths under the configured scan root (analyze `--root`). Paths outside that root MUST be omitted. Binary files MAY be omitted with a warning on stderr.

#### Scenario: Ignore files outside scan root

- **WHEN** `git diff HEAD` lists a changed file outside the scan root
- **THEN** that path does not appear in the exported `nodes` array
