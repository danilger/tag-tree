## Context

See proposal.md — Why. Change sets live in `changes/` with yellow overlay + Review (`Shift+R`). Tag filter already has a searchable dropdown pattern to mirror for single-select. Deep links (`file`, `focus`, `tags`, …) already exist for agents to cite. File viewer already renders `comment` / line `notes` for change hunks.

## Goals / Non-Goals

**Goals:**

- `notes/` JSON + API; searchable single-select; dedicated pale-blue guide; mutual exclusion with changes; `/tag-tree-note`; required `label` + `guide` map

**Non-Goals:**

- Generating note content inside the browser (agents write files)
- Diff / `prev_row` for notes
- Merging notes into `changes/` export pipeline
- Deep-link param `note=` in v1 (agents use node deep links inside prose; optional later)

## Decisions

### Storage: `notes/<id>.json`

**Choice:** Parallel to `changes/`, schema:

```json
{
  "label": "How authentication works",
  "guide": {
    "goal": "…",
    "order": ["shared/auth/store.ts", "…"]
  },
  "nodes": [
    {
      "path": "shared/auth/store.ts",
      "comment": "…",
      "notes": [{ "line": 42, "text": "…" }]
    }
  ]
}
```

`id` = filename without `.json`. `label` is mandatory for UI. `guide.order` is the viewing map (all participating paths SHOULD appear here; `nodes[].path` entries SHOULD align).

**Why:** Separates explain-notes from git-backed change sets.

### Mutual exclusion

**Choice:** One piece of App state “overlay mode”: either `change` or `note` or neither. Setting `selectedNoteId` clears `selectedChangeId` (and review open); setting change clears note (and notes guide open).

### UI chrome

**Choice:** Searchable single-select to the right of Review (reuse TagFilter interaction patterns, not multi). Separate `AiNotesGuidePanel` component (clone structure of ReviewGuidePanel, pale-blue classes, title “AI notes”). **Shift+N** mirrors Shift+R ignore rules.

### Visual language

**Choice:** Pale blue fill/hatch for note overlay nodes + button/panel accents (`--note-overlay` CSS vars), never yellow change tokens.

### Mode: Only notes

**Choice:** New `ViewMode` value `notes` (UI: **Only notes**), parallel to `changed` / Only changed — filter canvas to `notePaths`; empty when no note selected. Deep link `mode=notes`.

### File viewer

**Choice:** When note active, pass note node payload into FileModal as comment/notes source; use current-file view (not Diff) even if `prev_row` absent.

### Agent command name

**Choice:** `/tag-tree-note` [optional id] [topic…]

Install via existing `tag_tree init` templates. Instructions: create/update `notes/<id>.json`; require `label` + `guide`; fill comments/notes; remind to optionally embed deep links like `?file=…&focus=…&split=1` when helpful.

### API

**Choice:** Mirror changes handlers in `vite-file-api.ts` for `notes/` directory.

## Risks / Trade-offs

- **[Risk] Operators confuse Notes vs Changes** → Mitigation: separate folder, pale blue vs yellow, mutual exclusion, distinct control label “AI notes”
- **[Risk] Stale paths in guide.order** → Mitigation: soft skip missing paths on click; agent command says order must match real graph ids
- **[Risk] Duplicate panel code** → Mitigation: accept small duplication for visual independence (operator asked for separate panel)

## Migration Plan

None. Empty `notes/` until agents create files. Re-`init --force` for command/skill.

## Open Questions

None — decisions locked with the operator.
