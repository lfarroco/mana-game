---
trigger: always_on
---

The Playwright e2e suite (`phaser/e2e/`) is currently broken: 0 tests are collected due to stale imports (see `docs/code-quality-cleanup.md`, section 1). Do not rely on it for validation until the pipeline is fixed. Use `npm run typecheck`, `npm run lint` (in `phaser/`), and the core test suite (`cd core && npm test`) instead.
