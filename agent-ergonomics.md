# Agent Ergonomics Plan — Making the Repo Easier for AI Agents

Started 2026-08-14. Goal: correct stale docs, add per-package agent guides, add a
verification cheat-sheet, and remove dead-code traps so agents can orient and
verify faster.

## Phase 1 — Correct the misleading docs (P0)

- [x] 1. Rewrite `core/README.md` current-state + consumption points; mark migration plan historical; document compat shims
- [x] 2. Update `docs/achievement-system.md` → core/Achievements + runComplete, thin phaser adapter
- [x] 3. Update `docs/options-system.md` → core/src/settings/*, OptionsStore as wrapper
- [x] 4. Update `docs/localization.md` → core/src/i18n/translator.ts engine + phaser catalogs
- [x] 5. Fix `docs/storage-system.md` path → phaser/src/Systems/Storage/
- [x] 6. Add exact file pointers to `docs/trigger-system.md` and `docs/character-unit-system.md`
- [x] 7. Expand `docs/building-and-running.md` with per-package commands + Makefile targets
- [x] 8. Fix stale server-phase status + `-.` typo in root `AGENTS.md`

## Phase 2 — Per-package agent guides + verification cheat-sheet (P1)

- [x] 9. Add Verification commands section to root `AGENTS.md`
- [x] 10. Create `core/AGENTS.md`, `framework/AGENTS.md`, `server/AGENTS.md`, `phaser/AGENTS.md`; slim root to point at them

## Phase 3 — Remove dead-code traps (P2)

- [x] 11. Delete the 3 empty unreferenced files (handleOrbShopPhase.ts, PureShop.ts, Battleground/Effects.ts)

## Phase 4 — phaser README

- [x] 12. Add `phaser/README.md`

## Validation

- [x] 13. Run test+typecheck for all four packages
  - core: 66 suites / 602 tests, typecheck clean
  - framework: 7 suites / 56 tests, typecheck clean
  - server: 14 suites / 167 tests, typecheck clean
  - phaser: 7 suites / 38 tests, typecheck + lint clean
