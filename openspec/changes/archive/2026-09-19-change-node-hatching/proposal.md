## Why

Change-set nodes on the canvas are marked with a green border/glow that looks like a generic accent and is easy to confuse with other highlights. Operators need a distinctive, reserved background pattern so “in this change set” is unambiguous.

## What Changes

- Replace the green change-node border/glow with a bright yellow background plus cross-hatching fill, and dark contrasting text.
- Do not apply a special change border color; nodes keep the normal border treatment (unless other non-change styling applies).
- Document that yellow+hatching fill is reserved exclusively for change-set overlay (not for tags, config colors, focus, or search blink).
- Update README / DocsModal text that still describes a “green overlay”.

## Capabilities

### New Capabilities

- `change-overlay`: Visual treatment of graph nodes that belong to the selected agent change set.

### Modified Capabilities

- (none)

## Impact

- `src/GraphView.tsx` (`changeOverlay` inline styles / `CHANGE_BORDER`)
- `src/styles.css` (`.file-node.change-overlay`)
- Docs: README, DocsModal (and `changes/README.md` if it mentions green overlay)
