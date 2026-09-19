## Context

See proposal.md. `bindReadonlyVimKeys` already calls `onGoToDefinition` for `gd`. `FileModal.runGoToDefinition` reads the editor caret and uses `resolveDefinition`.

## Goals / Non-Goals

**Goals:**

- Ctrl/⌘ + left button down on a text position moves the caret there and invokes the same `onGoToDefinition` callback as `gd`
- Works in Editor and DiffEditor modified pane (same bind path)

**Non-Goals:**

- Underline-on-Ctrl hover affordance
- Peek definition UI
- Changing graph Ctrl+click semantics

## Decisions

### Handler placement

**Choice:** Extend `bindReadonlyVimKeys` cleanup to also dispose `onMouseDown` when `onGoToDefinition` is provided.

**Why:** One bind/unbind site already used by FileModal for both editor modes.

### Modifiers

**Choice:** `ctrlKey || metaKey` (⌘ on macOS), left button only.

**Why:** Matches VS Code and existing Explorer/graph Ctrl/⌘ patterns in this app.

## Risks / Trade-offs

- **[Risk] Conflicts with multi-cursor modifier** → Accept; viewer is read-only, multi-cursor unused.

## Open Questions

None.
