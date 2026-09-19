# agent-explain Specification

## Purpose

Defines how agents, via a Cursor slash command and updated skill text, produce a tag-tree change set that explains the current dirty working tree with file-level and line-level comments for graph nodes.

## Requirements

### Requirement: Slash command explains dirty working tree only

The project SHALL ship a Cursor command `/tag-tree-explain` whose procedure explains **only** uncommitted changes relative to `HEAD` (working tree + index), using the existing git export path. The command MUST NOT accept or document a git commit/ref argument in this capability.

#### Scenario: Invoke without a change name

- **WHEN** the operator runs `/tag-tree-explain` with no change-set name
- **THEN** the agent exports dirty vs `HEAD` and invents a short kebab-case change id (and matching label) from the meaning of the diff

#### Scenario: Invoke with a change name

- **WHEN** the operator runs `/tag-tree-explain <name>` (or equivalent trailing name token)
- **THEN** the agent uses that name as the change-set id for `changes/<id>.json` (normalized to a safe filename id) and as the preferred UI label unless a clearer label is already intended

### Requirement: Explain command authors the review guide

When `/tag-tree-explain` produces or refreshes a change set, the agent SHALL also set top-level `review` with:

- `goal` — high-level purpose of the dirty change; include a short reason why the first path in `order` is the sensible place to start review
- `order` — paths from the exported set in an agent-chosen sequence that is logical for human review (not required to match export or filesystem order)

The command remains the **initial** author of `review` (and of file `comment` / `notes`). Any agent MAY later refine `review`, comments, or notes when the user asks.

#### Scenario: Explain fills review

- **WHEN** the agent completes `/tag-tree-explain` for a non-empty graph-scoped export
- **THEN** `changes/<id>.json` includes a non-empty `review.goal` and a non-empty `review.order` listing exported paths in review order

#### Scenario: First path justified in goal

- **WHEN** the agent writes `review.goal` and `review.order`
- **THEN** `goal` briefly explains why review should start with `order[0]`

### Requirement: Export is graph-scoped

The explain procedure SHALL run the git export with `--graph-only` so structural nodes and authored comments target paths present in the tag-tree graph. The agent MUST NOT invent `path`, `rows`, or `prev_row`; those come from export.

#### Scenario: Export before commenting

- **WHEN** the agent follows `/tag-tree-explain`
- **THEN** it runs `export-change` (or the equivalent script) with `--root` matching the scan root, `--id` set to the chosen name, and `--graph-only` before editing comments

#### Scenario: Empty graph overlap

- **WHEN** export with `--graph-only` yields no nodes
- **THEN** the agent reports that outcome and does not fabricate non-graph paths for overlay comments

### Requirement: File comment and line notes content

For each exported node the agent MAY set:

- `comment` — overall understanding of the file’s change and how it relates to other files in the same change set when relevant
- `notes` — line-anchored explanations for functions, classes, variables, and other key fragments touched by the diff; each note MUST be more specific than the file comment and refer to the code at that line (1-based current file)

On re-run for the same id, the agent SHOULD replace prior `comment`/`notes` text with a fresh explanation rather than appending duplicates.

#### Scenario: Cross-file summary

- **WHEN** the change set includes multiple related files
- **THEN** each file’s `comment` (where authored) situates that file’s change in relation to the others as appropriate

#### Scenario: Key fragment notes

- **WHEN** a changed file contains identifiable symbols or key fragments in the diff
- **THEN** the agent adds `notes` entries for those anchors rather than only a file-level comment

### Requirement: Comment language follows the user

Authored `comment` and `notes` text SHALL use the language of the operator’s latest user message in the conversation (the message that invoked or accompanied the command).

#### Scenario: Russian latest message

- **WHEN** the latest user message is in Russian
- **THEN** file comments and line notes are written in Russian

#### Scenario: English latest message

- **WHEN** the latest user message is in English
- **THEN** file comments and line notes are written in English

### Requirement: Command is installable and skill stays aligned

`tag_tree init` for Cursor SHALL install `/tag-tree-explain` alongside the existing subtree command. The packaged agent skill SHALL describe git export plus agent-owned `label` / `comment` / `notes` (not hand-authored `rows`/`prev_row`) and SHALL reference `/tag-tree-explain` for the explain workflow.

#### Scenario: Init installs explain command

- **WHEN** an operator runs `tag_tree init --agent cursor` (or `both`) with force as needed
- **THEN** `.cursor/commands/tag-tree-explain.md` is written from the template

#### Scenario: Skill points at explain

- **WHEN** an agent reads the installed tag-tree skill’s change-set section
- **THEN** it learns to export from git and that `/tag-tree-explain` is the preferred way to add explanations
