## Context

See proposal.md. Theme already uses `tag-tree-theme` in localStorage via `readStoredTheme` / effect write.

## Goals / Non-Goals

**Goals:**

- Persist and restore: `explorerOpen`, `splitView`, `fileZoomed`, `splitRatio`
- Coerce: if `splitView` is false, treat `fileZoomed` as false when reading/writing

**Non-Goals:**

- Persisting the open file path / modal contents
- Persisting review panel geometry (already session-only by design)
- Persisting selected tags / change set

## Decisions

### Single JSON key

**Choice:** `tag-tree-layout` JSON `{ splitView, fileZoomed, explorerOpen, splitRatio }`.

**Why:** One read/write; easier to extend than four keys.

### Empty split on restore

**Choice:** Restore `splitView` even if no file is open yet.

**Why:** Matches user request to restore split chrome; opening a node fills the pane.

## Risks / Trade-offs

- **[Risk] Corrupt localStorage** → Mitigation: validate types; fall back to defaults.

## Open Questions

None.
