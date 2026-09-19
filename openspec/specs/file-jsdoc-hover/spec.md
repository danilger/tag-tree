# file-jsdoc-hover Specification

## Purpose

Show JSDoc from a symbol’s definition site in the Monaco file viewer, including when that definition lives in another file reached via the import graph.

## Requirements

### Requirement: Hover shows preceding JSDoc at declaration sites

When the file viewer displays a TypeScript or JavaScript file and the user hovers an identifier, the application SHALL resolve the symbol’s definition using the same graph-assisted resolution as go-to-definition. When the definition line has a contiguous `/** … */` block immediately above it (blank lines and single-line `//` comments between the JSDoc and the declaration MAY be skipped), the application SHALL show that JSDoc body in a Monaco hover tooltip. If the definition is in another file, the application SHALL load that file’s content as needed. If no definition or no such JSDoc exists, the custom hover MUST not show an empty tooltip for that reason alone.

#### Scenario: Hover on imported symbol shows defining-file JSDoc

- **WHEN** the open file imports a symbol from another graph-linked file
- **AND** that defining file has a `/** … */` block immediately above the symbol’s declaration
- **AND** the user hovers the imported identifier at a use site
- **THEN** a hover tooltip shows the JSDoc body from the defining file

#### Scenario: Hover on documented function

- **WHEN** the open file contains a `/** … */` block immediately above a `function Foo` (or `export function Foo` / `async function Foo`) declaration
- **AND** the user hovers the identifier `Foo` on that declaration line
- **THEN** a hover tooltip shows the JSDoc body text

#### Scenario: Hover on documented const / class / type

- **WHEN** a `const`, `class`, `type`, `interface`, or `enum` declaration has a preceding `/** … */` block
- **AND** the user hovers that declaration’s name
- **THEN** a hover tooltip shows that JSDoc body text

#### Scenario: No JSDoc → no custom empty hover

- **WHEN** the user hovers an identifier whose resolved definition has no preceding `/** … */` block
- **THEN** the custom JSDoc hover does not present an empty documentation tooltip

#### Scenario: Diff and single editor

- **WHEN** the file is shown in the single Editor or in the DiffEditor modified pane
- **THEN** the same JSDoc hover behavior is available for TypeScript/JavaScript content
