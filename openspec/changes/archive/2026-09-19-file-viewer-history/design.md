## Context

See proposal.md. File opens go through `App.openNode` / `openDefinition`. Graph selection is updated via `GraphView.locateNode`. Monaco binds `h`/`l` for caret move; canvas binds `h`/`l` for hop; App already uses Ctrl+Shift+H/L for pane focus.

## Goals / Non-Goals

**Goals:**

- Stack of `{ path, line }` for successful opens; truncate forward branch on new open
- Shift+H / Shift+L when viewer open: walk stack, reopen file+line, locate node on graph
- Keep editor keyboard focus when history is triggered from the viewer (locate without focusing canvas)
- Ignore Shift on canvas hop H/L so Shift+H/L do not start hop

**Non-Goals:**

- Persisting history across reload
- UI chrome for back/forward buttons
- Changing Ctrl+Shift+H/L pane focus

## Decisions

### History ownership

**Choice:** Refs in `App` updated from `openNode` success; navigation uses a `historyNavigating` flag to avoid re-pushing.

**Why:** Single open pipeline already centralizes loads.

### Locate without stealing focus

**Choice:** `locateNode(id, { focus?: boolean })` — default `true`; history uses `focus: false` (still select, blink, fit).

**Why:** User asked to switch node focus (selection), not leave the editor.

### Hotkey scope

**Choice:** App capture-phase handler when `fileViewerOpen`, Shift+H/L without Ctrl/Meta/Alt; allow from Monaco; ignore plain INPUT/TEXTAREA.

**Why:** Capture runs before Monaco caret handlers.

## Risks / Trade-offs

- **[Risk] Shift+H conflicts with hop** → Mitigation: canvas hop ignores `shiftKey` on H/L.
- **[Risk] History grows unbounded** → Cap at ~50 entries.

## Open Questions

None.
