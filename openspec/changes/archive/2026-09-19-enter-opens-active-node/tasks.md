## 1. Canvas Enter → open

- [x] 1.1 In `GraphView` hop keydown handler, after digit-buffer Enter handling, on bare Enter call `onNodeOpen` for hop preview target or selected anchor
- [x] 1.2 Ensure Enter is ignored when `shouldIgnoreHopHotkey` applies and when Ctrl/Meta/Alt are held

## 2. Docs

- [x] 2.1 Document Enter on canvas in README and DocsModal (open active / previewed node; digit buffer still confirms multi-digit hop)
