# path-family-glow Specification

## Purpose

Optional path-family background glows that visually group on-canvas file nodes by top-level path segment (after skipping `src`), with depth-based saturation, group hulls, and slow family pulse when a member is active.

## Requirements

### Requirement: Menu toggle defaults off

The control menu SHALL provide a Path glow (or equivalent) control that enables or disables path-family glows. The control SHALL default to **off**. When off, the app MUST NOT render path-family glow hulls, auras, or pulse animations for this feature.

#### Scenario: Default off

- **WHEN** the operator loads the app without changing Path glow
- **THEN** no path-family glow visuals appear on the canvas

#### Scenario: Enable shows glows

- **WHEN** the operator turns Path glow on and the canvas has eligible nodes
- **THEN** path-family glow visuals appear for participating nodes

### Requirement: Family from path with src skipped

For each node id/path, the glow **family** SHALL be the first path segment after skipping a leading `src` segment (case-sensitive segment `src`). Every distinct family present among participating nodes SHALL receive a glow treatment (not a fixed two-family whitelist). Family assignment applies at every path depth under that family.

#### Scenario: Skip src

- **WHEN** a node id is `src/app/store.ts`
- **THEN** its family is `app`

#### Scenario: Root segment is family

- **WHEN** a node id is `pages/request/ui/Form.tsx`
- **THEN** its family is `pages`

### Requirement: Sorted palette of distinct hues

Unique family ids among participating nodes SHALL be sorted alphabetically and assigned hues spaced across the hue circle so adjacent names in the sort are not adjacent hues. The mapping SHALL be deterministic for a given set of family ids.

#### Scenario: Two families differ in hue

- **WHEN** participating nodes include families `app` and `pages`
- **THEN** their assigned glow hues are visibly different (not near-neighbors on the hue wheel)

### Requirement: Depth reduces saturation with a floor

Within a family, deeper paths SHALL use lower saturation than shallower ones, scaled proportionally to depth within that family’s depth range (or an equivalent documented depth metric). The minimum saturation SHALL remain high enough that the deepest nodes keep a recognizable family hue (must not collapse to near-gray / colorless).

#### Scenario: Deeper is less saturated

- **WHEN** Path glow is on and family `pages` has both a shallow and a deep participating node
- **THEN** the deep node’s glow is less saturated than the shallow node’s, and both remain recognizably the same family hue

### Requirement: Group hull behind participating nodes

When Path glow is on, the canvas SHALL draw a soft background **group blot / hull** (or clustered hulls if a family is spatially split) behind participating nodes of each family so co-located files of the same family read as one aura. Glow SHALL render behind node cards and MUST NOT overpower change-set hatching, tag accents, or hop chrome.

#### Scenario: Same-family cluster shares a blot

- **WHEN** several participating `shared/*` nodes sit near each other with Path glow on
- **THEN** a soft common background blot of the `shared` family hue appears behind them

### Requirement: Only visible non-dimmed nodes participate

Path-family glow geometry and pulse SHALL include only nodes that are currently **rendered on the canvas** after the active view mode / filters (visible) and that are **not dimmed** as inactive under the current highlight or subtree-focus rules. Nodes filtered out of the layout, and dimmed inactive nodes, MUST NOT contribute to hulls, auras, or family pulse.

#### Scenario: Isolated tags exclude others

- **WHEN** Mode is Only highlighted with a tag filter so some files are absent from the canvas
- **THEN** absent nodes do not affect path-glow hulls

#### Scenario: Dimmed nodes excluded

- **WHEN** Highlight mode dims non-matching nodes (or subtree focus dims outsiders)
- **THEN** those dimmed nodes do not participate in path-glow hulls or pulse

### Requirement: Pulse only when a family member is active

While Path glow is on, glow visuals SHALL be static by default (no continuous pulse). When a participating node becomes **active** (canvas selection / hop anchor / Ctrl-focus equivalent used by the app), all **participating** nodes of that node’s family SHALL pulse slowly together. Pulse MUST respect `prefers-reduced-motion` (no motion or static equivalent).

#### Scenario: Idle is static

- **WHEN** Path glow is on and no participating node is active
- **THEN** family glows do not pulse

#### Scenario: Active pulses the family

- **WHEN** Path glow is on and the operator activates a participating `pages/*` node
- **THEN** all participating nodes of family `pages` pulse slowly; other families stay static

