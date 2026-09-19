## Purpose

Show local JSDoc documentation in the Monaco file viewer when the user hovers a declaration name that has a `/** … */` block immediately above it.

## ADDED Requirements

### Requirement: Hover shows preceding JSDoc at declaration sites

When the file viewer displays a TypeScript or JavaScript file and the user hovers an identifier that is the declared name on a declaration line, the application SHALL show a Monaco hover tooltip containing the text of the contiguous `/** … */` block immediately above that declaration (blank lines and single-line `//` comments between the JSDoc and the declaration MAY be skipped). If no such JSDoc exists, the custom hover MUST not show an empty tooltip for that reason alone.

#### Scenario: Hover on documented function

- **WHEN** the open file contains a `/** … */` block immediately above a `function Foo` (or `export function Foo` / `async function Foo`) declaration
- **AND** the user hovers the identifier `Foo` on that declaration line
- **THEN** a hover tooltip shows the JSDoc body text

#### Scenario: Hover on documented const / class / type

- **WHEN** a `const`, `class`, `type`, `interface`, or `enum` declaration has a preceding `/** … */` block
- **AND** the user hovers that declaration’s name
- **THEN** a hover tooltip shows that JSDoc body text

#### Scenario: No JSDoc → no custom empty hover

- **WHEN** the user hovers a declaration name with no preceding `/** … */` block
- **THEN** the custom JSDoc hover does not present an empty documentation tooltip

#### Scenario: Call site without local JSDoc above

- **WHEN** the user hovers an identifier that is not on a matching declaration line for that name
- **THEN** the custom JSDoc hover does not invent documentation from a distant declaration in the same file solely because the names match

#### Scenario: Diff and single editor

- **WHEN** the file is shown in the single Editor or in the DiffEditor modified pane
- **THEN** the same JSDoc hover behavior is available for TypeScript/JavaScript content
