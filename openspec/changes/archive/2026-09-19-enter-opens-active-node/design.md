## Context

See proposal.md — Why. Canvas hop keys live in `GraphViewInner`’s capture-phase `keydown` handler. Enter is already used to flush the hop digit buffer; Explorer already opens files on Enter. Docs mention Click for canvas open but not Enter.

## Goals / Non-Goals

**Goals:**

- Enter opens the active node via existing `onNodeOpen`
- Preserve digit-buffer Enter behavior
- Document the shortcut

**Non-Goals:**

- Changing click / Ctrl+click semantics
- Opening on Space
- New Vite APIs

## Decisions

### Active node for Enter

**Choice:** If hop phase is `preview` and `index != null`, open `targets[index]`; else open `selectedNodeIdRef.current`.

**Why:** Matches what the user sees as “active” (anchor vs blinking preview).

### Handler placement

**Choice:** Same `onKey` effect as hop (`shouldIgnoreHopHotkey`, no Ctrl/Meta/Alt).

**Why:** Consistent ignore rules with h/l/j/k.

## Risks / Trade-offs

- **[Risk] Enter during hop opens instead of commit** → Mitigation: hop commit remains `l`/`h`; Enter only opens (except digit flush). Documented.

## Open Questions

None.
