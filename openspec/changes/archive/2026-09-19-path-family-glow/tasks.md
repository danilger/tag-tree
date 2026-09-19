## 1. Family color helpers

- [x] 1.1 Add path→family (skip leading `src`) and depth helpers
- [x] 1.2 Build sorted-family → spaced HSL palette; depth sat with floor

## 2. Glow overlay + pulse

- [x] 2.1 Render soft group hulls behind participating nodes (visible + not dimmed), under node cards
- [x] 2.2 Wire active node → slow pulse for participating same-family nodes; honor `prefers-reduced-motion`
- [x] 2.3 Recompute hulls when layout / participants / toggle / active family change

## 3. Menu + docs

- [x] 3.1 Add Path glow menu toggle in App (default off); pass into GraphView
- [x] 3.2 Short README / DocsModal note (toggle, family, pulse-on-active)
