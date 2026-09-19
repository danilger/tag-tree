## Context

See proposal.md. Local-only hover is already shipped (`jsdocHover.ts` + Monaco providers). `resolveDefinition` already finds definition paths/lines across graph edges and fetches remote file text for `gd`.

## Goals / Non-Goals

**Goals:**

- Hover an identifier → JSDoc from the definition line (same graph resolution as `gd`)
- Cross-file: fetch definition file content when the hit path differs from the open file
- Same-file definitions still show JSDoc above that line
- Async Monaco `provideHover` with path/importTargets context from FileModal

**Non-Goals:**

- Full TypeScript language service
- Hover for module string literals / path-only jumps
- Caching layer beyond what `fetch` + browser provide (optional later)

## Decisions

### Reuse `resolveDefinition`

**Choice:** Call the same resolver as `gd`, then `jsdocAboveLine` on the definition file/line.

**Why:** One resolution story; hover and `gd` stay consistent.

### Context for global providers

**Choice:** Module-level `setJsdocHoverContext({ path, importTargets })` updated from FileModal when the open file changes; providers registered once.

**Why:** Hover providers are language-global; they need the current viewer identity.

### Fallback

**Choice:** If resolution fails or definition has no JSDoc, return null (no empty hover). Optional last-resort: local declaration JSDoc only when still on a declaration line — keep as secondary so same-file undocumented imports do not hide a local comment.

**Why:** Prefer definition-site docs; local fallback remains useful for local helpers.

## Risks / Trade-offs

- **[Risk] Hover latency from network fetch** → Mitigation: same-file uses open buffer; browser HTTP cache helps repeats.
- **[Risk] Stale context if FileModal unmounts** → Mitigation: clear context on close / null file.

## Open Questions

None.
