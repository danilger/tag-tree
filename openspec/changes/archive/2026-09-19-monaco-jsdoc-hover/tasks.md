## 1. JSDoc extraction + hover provider

- [x] 1.1 Add helper to detect declaration line for an identifier and extract preceding `/** … */` (normalize body for display)
- [x] 1.2 Register Monaco hover providers for `typescript` and `javascript` (idempotent), wired from `FileModal` onMount (Editor + DiffEditor modified)

## 2. Docs

- [x] 2.1 Note in README or DocsModal that hovering a declaration shows local JSDoc when present
