## Why

On the canvas, an active (selected/anchor) node can only be opened with a click. Keyboard hop users need Enter to open the file viewer for the active node, matching Explorer’s Enter behavior.

## What Changes

- Pressing Enter on the graph canvas opens the file modal/panel for the active node (selected anchor, or the hop preview target when a neighbor is previewed).
- Enter still confirms a multi-digit hop edge choice when a digit buffer is pending.
- Docs list Enter under canvas shortcuts.

## Capabilities

### New Capabilities

- `graph-keyboard`: Canvas keyboard navigation and opening the file viewer from the active node.

### Modified Capabilities

- (none)

## Impact

- `src/GraphView.tsx` hop/keydown handler
- README / DocsModal canvas shortcut tables
