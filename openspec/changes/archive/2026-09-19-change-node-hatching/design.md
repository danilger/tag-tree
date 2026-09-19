## Context

See proposal.md — Why. Today `FileNode` applies `CHANGE_BORDER` (`#00c853`) and a green `boxShadow` when `changeOverlay` is true; there is no dedicated `.change-overlay` background. Docs still speak of a “green overlay”. Tag/config colors, highlight, focus, and search-blink are separate class/style paths.

## Goals / Non-Goals

**Goals:**

- Bright yellow base + cross-hatching as the sole change-overlay chrome on the node body, with dark contrasting text
- Remove green change border/glow
- Document reserved use of hatching
- Keep readable in light and dark themes (fixed yellow + dark text, not theme `--text`)

**Non-Goals:**

- Changing Monaco change-line greens or comment box greens (file viewer, not canvas)
- Per-hunk or staged/unstaged color variants on the graph
- Animating the hatch

## Decisions

### 1. Hatching via CSS, not inline JS colors

**Choice:** `.file-node.change-overlay` with bright yellow `background-color`, a single `repeating-linear-gradient` hatch (~45°, dark lines at ~10% alpha), and forced dark text; leave default border from `.file-node`.

**Why:** One-direction hatch stays quieter than cross-hatch; yellow + dark text remain readable on both themes.

### 2. Remove green overlay chrome entirely

**Choice:** Delete `CHANGE_BORDER` usage for change overlay (and any leftover green fill if reintroduced). Do not substitute another accent border for changes.

**Why:** User decision — green was not distinctive enough; hatching only.

### 3. Interaction with `config.nodes` bgColor

**Choice:** When `changeOverlay` is true, hatching owns the background (do not also apply `data.bgColor` as a solid override that hides the hatch). Tag border colors may still apply if we stop short-circuiting the entire `else` branch — prefer: change overlay sets hatch background only; allow optional tag/`nodeColor` border unless it fights readability. Default for v1: hatching background + default border (skip forcing config border while overlay is on), matching “hatching is the change signal”.

**Why:** Avoid solid config `bgColor` wiping the reserved pattern.

### 4. Docs

**Choice:** README agent-changes / toolbar Changes bullets and DocsModal “Changes” / agent-changes sections: replace “green overlay” with “bright yellow + cross-hatching (reserved for change sets)”.

## Risks / Trade-offs

- **[Risk] Hatch too strong in dark theme** → Mitigation: low-contrast gray via `color-mix` / low alpha lines; tune in CSS variables if needed.
- **[Risk] Confusion with disabled/dimmed opacity** → Mitigation: hatching remains visible at normal opacity; dimmed nodes still use opacity separately.
- **[Trade-off] Monaco viewer still uses green** → Acceptable; canvas and editor are different surfaces.

## Open Questions

None — hatching-only and no green border are fixed.
