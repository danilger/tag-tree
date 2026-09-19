## ADDED Requirements

### Requirement: Explain command authors the review guide

When `/tag-tree-explain` produces or refreshes a change set, the agent SHALL also set top-level `review` with:

- `goal` — high-level purpose of the dirty change; include a short reason why the first path in `order` is the sensible place to start review
- `order` — paths from the exported set in an agent-chosen sequence that is logical for human review (not required to match export or filesystem order)

The command remains the **initial** author of `review` (and of file `comment` / `notes`). Any agent MAY later refine `review`, comments, or notes when the user asks.

#### Scenario: Explain fills review

- **WHEN** the agent completes `/tag-tree-explain` for a non-empty graph-scoped export
- **THEN** `changes/<id>.json` includes a non-empty `review.goal` and a non-empty `review.order` listing exported paths in review order

#### Scenario: First path justified in goal

- **WHEN** the agent writes `review.goal` and `review.order`
- **THEN** `goal` briefly explains why review should start with `order[0]`
