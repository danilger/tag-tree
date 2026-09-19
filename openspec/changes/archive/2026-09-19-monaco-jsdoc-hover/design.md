## Context

See proposal.md — Why. `FileModal` mounts `@monaco-editor/react` Editor / DiffEditor with syntax highlighting only. Go-to-definition is custom (`goToDefinition.ts`). Monaco’s TS worker is not configured as a project language service, so built-in JSDoc hover is unreliable or absent.

## Goals / Non-Goals

**Goals:**

- Hover on a declaration identifier shows the contiguous `/** … */` block immediately above that declaration (skipping blank lines and `//` lines between JSDoc and declaration).
- Works in single Editor and DiffEditor modified pane.
- Same languages as file preview for TS/JS (`typescript`, `javascript`).

**Non-Goals:**

- Full Monaco TypeScript language service / multi-file models
- Hover at call sites with types from other modules
- `@param` / `@returns` structured rendering beyond plain markdown/text of the comment
- Hover for CSS/JSON/other languages

## Decisions

### Custom hover provider (not TS worker)

**Choice:** `monaco.languages.registerHoverProvider` that reads the model text, finds the identifier under the position, confirms the cursor is on a declaration line for that name, then extracts the preceding JSDoc.

**Why:** Matches existing lightweight `gd` approach; no worker/vite plugin cost.

### When to show

**Choice:** Show only when the hovered identifier is the declared name on a declaration-like line (`function` / `class` / `const` / `let` / `var` / `type` / `interface` / `enum`, including `export` / `async` / `default` variants, and simple method-ish `name(` on a line that looks like a member). If there is no JSDoc above, return `null` (no empty hover).

**Why:** Avoids showing stale docs when hovering a call or parameter with the same name.

### Registration lifecycle

**Choice:** Register providers once per Monaco instance (idempotent guard / dispose on remount cleanup if needed). Share one provider for `typescript` and `javascript`.

**Why:** FileModal remounts editors often; avoid duplicate providers stacking.

### Content format

**Choice:** Hover `contents` as markdown string: strip leading `*` / `/**` / `*/` for readability, keep body text.

**Why:** Matches VS Code-ish readability without parsing tags.

## Risks / Trade-offs

- **[Risk] False positives on non-declarations** → Mitigation: require declaration-shaped line and name match.
- **[Risk] Missed JSDoc with `/*` (non-JSDoc) or detached comments** → Accept; only `/**` contiguous above declaration.
- **[Risk] Built-in Monaco hover also runs** → If both fire, Monaco merges; our provider returns null when no JSDoc so noise stays low.

## Open Questions

None.
