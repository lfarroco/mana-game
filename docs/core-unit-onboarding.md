# Core Unit Onboarding & Themed Upgrades

> Approved design (2026-08-19). Companion to
> [card-design-philosophy.md](card-design-philosophy.md),
> [unit-balance.md](unit-balance.md), and
> [encounter-system.md](encounter-system.md).

Core units ("crystals") are the first unit the player picks and the anchor of
their playstyle. Each carries an implicit **theme** (its basic-action family).
Today each core ships with **two effects + one reaction** — a lot of conditional
language (`left_ally`, `row_allies`, `column`) for the first card a new player
reads. This document describes the plan to make cores simpler at the start and
move their depth into **theme-scoped upgrade orb events** the player chooses over
the run.

---

## 1. Decisions (approved)

| #   | Decision                                                                                                                                            |
| :-- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Simpler at start is better.** Baseline core = one basic action + stats. The secondary buff and the reaction move into the themed upgrade pool.    |
| 2   | **Enemies use the same simplified cores.** Difficulty is restored by scaling enemy power/life by round in `generateEnemyTeam.ts`.                   |
| 3   | **Cores get a higher AP ceiling.** A separate core AP band (not the bronze `[80, 160]` band) — cores are allowed to be stronger than regular units. |
| 4   | **`quickstone` keeps `haste` as its theme/baseline.** `regen` is the paired "refresh" buff and moves to its identity-orb pool.                      |

---

## 2. The theme model

Add a `coreTheme` field to `CardDefinition` (`core/src/types/card.ts`). It is the
single filter key for upgrade-orb generation and for the crystal-selection UI
("this is a _heal_ crystal").

```ts
export const CORE_THEMES = [
  "regen", "damage", "shield", "heal", "poison", "haste",
] as const;
export type CoreTheme = (typeof CORE_THEMES)[number];

// on CardDefinition:
coreTheme?: CoreTheme;
```

Each core's `coreTheme` equals its **basic-action family**. After the baseline
change (decision 4), the six themes map 1:1 to six distinct effect types:

| Core                 | `coreTheme` | Baseline action |
| :------------------- | :---------- | :-------------- |
| `mana_crystal`       | `regen`     | regen           |
| `critical_crystal`   | `damage`    | damage          |
| `protective_crystal` | `shield`    | shield          |
| `growth_crystal`     | `heal`      | heal            |
| `purple_crystal`     | `poison`    | poison          |
| `quickstone`         | `haste`     | haste (row)     |

> Note: this fixes a latent inconsistency — today _two_ cores (`mana_crystal`,
> `quickstone`) both key off regen; after the change each effect type has exactly
> one core.

---

## 3. Baseline cores (simplified)

Each core is reduced to its basic action. Everything else moves into the themed
upgrade pool (§4). Stats (life/power/cooldown) stay as-is in the first pass;
enemy scaling (§6) absorbs the early-power gap.

| Core                 | Baseline effects     | Removed → becomes an identity orb                                                           |
| :------------------- | :------------------- | :------------------------------------------------------------------------------------------ |
| `mana_crystal`       | `[regen]`            | `increasePower(10, column)`; reaction `damage ← left_ally → charge(self)`                   |
| `critical_crystal`   | `[damage]`           | `increaseCritical(5, column)`; reaction `all ← row_allies → +5 power (column)`              |
| `protective_crystal` | `[shield]`           | `increasePower(5, randomAlly, permanent)`; reaction `all ← row_allies → +5 power (trigger)` |
| `growth_crystal`     | `[heal]`             | `increasePower(2, column, permanent)`; reaction `all ← row_allies → +5 power (trigger)`     |
| `purple_crystal`     | `[poison]`           | `slow(1000, randomEnemy)`; reaction `slow ← allies → +4 power (trigger, permanent)`         |
| `quickstone`         | `[haste(1000, row)]` | `regen`; reaction `haste ← right_ally → charge(200, column)`                                |

---

## 4. Themed upgrade-orb catalog

New file: `core/src/content/coreUpgradeOrbs.ts` (data-only, mirrors
`OrbDefinitions.ts`). A core-specific definition type:

```ts
export type CoreUpgradeDefinition = {
  id: string;
  theme: CoreTheme;
  kind: "effect" | "reaction" | "stat";
  effect?: Effect; // appended to core.effects
  reaction?: EffectReaction; // appended to core.reactions
  stat?:
    "increase_core_max_life" | "upgrade_core_power" | "decrease_core_cooldown";
  minRound?: number; // round gate, like encounter minRound
};
```

- **Stat orbs** (generic, already exist): `increase_core_max_life`,
  `upgrade_core_power`, `decrease_core_cooldown` — keep them; they're the
  "bigger numbers" fallback in every theme's pool.
- **Identity orbs** (new, theme-scoped): the abilities removed in §3, plus 2–3
  new on-theme twists. Where possible these **reuse the existing generic
  reaction orbs** in `OrbDefinitions.ts` (`on_10_regen_effect`,
  `on_over_heal_effect`, `on_crit_effect`, `on_100_shield_effect`,
  `on_10_poison_effect`, `on_re_slow_effect`, `on_re_haste_effect`) so most of
  the catalog is "removed ability" orbs plus a handful of genuinely new ones.

### Per-theme pool sketch

| Theme                 | Identity orbs                                                                                                                                                                                                             |
| :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `regen` (mana)        | Column Growth (`increasePower(10, column)`); Reactive Charge (`damage ← left_ally → charge self`); Overflow Shield (`on_over_heal → shield`); Regen Charge (`every_10_regen → charge random ally`)                        |
| `damage` (critical)   | Crit Column (`increaseCritical(5, column)`); Row Power (`all ← row_allies → +5 power column`); Crit Power (`on_crit → increasePower`); Crit Slow (`on_crit → slow enemy`)                                                 |
| `shield` (protective) | Shield Ally Power (`increasePower(5, randomAlly, permanent)`); Shield Trigger Power (`all ← row_allies → +5 power trigger`); Shield Power (`every_100_shield → increasePower`); Overflow Shield (`on_over_heal → shield`) |
| `heal` (growth)       | Growth Column (`increasePower(2, column, permanent)`); Growth Trigger (`all ← row_allies → +5 power trigger`); Overflow Power (`on_over_heal → increasePower`); Heal Power (`every_100_heal → increasePower`)             |
| `poison` (purple)     | Slow Enemy (`slow(1000, randomEnemy)`); Slow Power (`slow ← allies → +4 power trigger, permanent`); Poison Power (`every_10_poison → increasePower`); Re-Slow Drain (`re_slow → decrease enemy power`)                    |
| `haste` (quickstone)  | Regen (`regen`); Haste Charge (`haste ← right_ally → charge column`); Re-Haste Crit (`re_hasted → increaseCritical`); Haste Power (ally hasted → increasePower)                                                           |

---

## 5. Delivery & generation

- Reuse the **existing** `upgrade_core` (after every combat) and
  `add_reaction_core` (rounds 2/6/10) phases — no new phase, no `PhaseConfig`
  change.
- First themed upgrade lands **end of round 1**, so the simplified core regains
  depth immediately.
- Replace the static option lists in `SessionTransitions.ts` with:

```ts
function generateCoreUpgradeOptions(
  session: Models.SessionData,
): Models.PhaseOption[];
```

- Reads the player core's `cardId` → `coreTheme`.
- Draws 3 options from that theme's pool using the seeded RNG (deterministic —
  **critical** for the replay/multiplayer invariant).
- Filters out identity orbs already applied to the core.
- `minRound` gates which orbs may appear.

- Application: extend `OrbAndCoreUpgrades.applyOrb` (or add a sibling
  `applyCoreUpgrade`) to append the `effect`/`reaction` onto the core unit, or
  call the existing stat helpers.

---

## 6. Enemy scaling

Enemy teams pick their core from `Card.getCores()` (`generateEnemyTeam.ts`), so
they inherit the simplified baseline. Compensate in `generateEnemyTeam`:

- Tune the existing round-scaled power (`distributePowerPoints`, `round * 10`)
  and the per-round core life bump (`100 * (round - 1)`) so early rounds keep
  their intended difficulty despite the player's simpler core.
- Keep enemy _cores_ simple; scale enemy _stats_ — this preserves the
  "player learns the mechanic, then faces it" curve rather than giving enemies
  abilities the player hasn't unlocked yet.

> ✅ **CUB-D1 (2026-08-19)** — `generateEnemyTeam.ts` now uses
> `ENEMY_POWER_POINTS_PER_ROUND = 20` (was `round * 10`) and
> `ENEMY_CORE_LIFE_PER_ROUND = 150` (was `100 * (round - 1)`). The core is the
> only life-bearing unit (win/loss is core life), so these two stats absorb the
> action-only baseline's ~2–3× core AP loss: round 1: 4 units at +5 power each,
> core life 500; round 5: +11 power each, core life 1100; round 10: +22 power
> each, core life 1850. Locked in by `generateEnemyTeam.test.ts`.

---

## 7. Balance model (core AP)

Cores are already excluded from the bronze AP model
(`BaseCollection.balance.test.ts`: `nonCoreCards = ALL_CARDS.filter(c => !c.isCore)`).
That exclusion is currently binary. Make it explicit:

- Add a **core AP band** with a higher ceiling (cores run ~2–3× a bronze's
  output). Starting point: `[150, 500]` AP per 5s for a fully-built core
  (baseline + 2–3 themed orbs), versus bronze `[80, 160]`.
- Enforce it in a new `coreUpgrades.balance.test.ts` (or a sibling describe
  block) that computes marginal AP per orb against the band, so a single
  over-tuned orb is caught.
- Where the AP model genuinely cannot price an orb (risk/flavor), use a
  `CORE_UPGRADE_ALLOWLIST` with a written justification — mirroring
  `AP_ALLOWLIST` (see `card-design-philosophy.md` §6).

---

## 8. Task list

> Pick a task, mark `[x]` with agent name + date when done, then remove the
> entry. Order is dependency-aware; A before B before C, etc.

### Phase A — data model & baseline (`core/`)

- [ ] **CUB-A1** — add `CoreTheme` + `CORE_THEMES` + `coreTheme` to `CardDefinition` (`core/src/types/card.ts`).
- [ ] **CUB-A2** — set `coreTheme` on all 6 cores; reduce each to its action-only baseline per §3 (`core/src/data/cards/coreCards.ts`); quickstone baseline → `haste(1000, row)`.
- [ ] **CUB-A3** — create `core/src/content/coreUpgradeOrbs.ts` with `CoreUpgradeDefinition` + the per-theme catalog (§4), reusing existing reaction orbs where possible.

### Phase B — generation & application (`core/`)

- [ ] **CUB-B1** — `generateCoreUpgradeOptions(session)` in `SessionTransitions.ts`: theme-scoped, seeded/deterministic, dedupes applied orbs, honors `minRound`.
- [ ] **CUB-B2** — wire themed options into the `upgrade_core` and `add_reaction_core` transitions (replace static `UPGRADE_CORE_OPTIONS` / `ADD_REACTION_CORE_OPTIONS`).
- [ ] **CUB-B3** — extend `OrbAndCoreUpgrades` to apply `CoreUpgradeDefinition` (append effect/reaction, or call the stat helpers).

### Phase C — balance (`core/`)

- [x] **CUB-C1** — core AP band + `coreUpgrades.balance.test.ts` (or describe block) with `CORE_UPGRADE_ALLOWLIST` support.

### Phase D — enemy scaling (`core/`)

- [x] **CUB-D1** — retune `generateEnemyTeam.ts` round-scaled power/life to compensate for simplified cores.

### Phase E — UI & onboarding (`phaser/`)

- [x] **CUB-E1** — crystal-selection description renders the baseline only; `upgrade_core`/`add_reaction_core` UI renders themed orb names/descriptions.
- [x] **CUB-E2** — i18n keys for new orbs + theme labels (all locales).

### Phase F — tests & verification

- [x] **CUB-F1** — unit tests: themed option generation (determinism, theme-scoping, dedupe, minRound).
- [x] **CUB-F2** — full verification: `cd core && npm test`, `cd core && npm run typecheck`, `cd phaser && npm run test:ci`, `cd phaser && npm run lint`.

### Phase G — new cores (later; see §9)

- [ ] **CUB-G1** — implement 1–2 new cores from §9 (each is a full A2/B/C/D pass for its own theme).

### Relationship to existing wacky-content tasks

- `A13` (`upgrade_core` Mystery Box) and `A14` (`add_reaction_core` random
  option) are **subsumed/superseded** by CUB-B1/B2 — theme-scoped options replace
  the static lists those tasks edit. Close them or fold them in when landing B.

---

## 9. New core unit ideas

Candidate new cores (each = a new theme + baseline + identity-orb pool). Flagged
with which new effect types they'd need (see
[wacky-content-plan.md](wacky-content-plan.md) B1/C1/C2/D1/D2).

| Idea                 | Theme                    | Baseline                         | Identity orbs (sketch)                                                                                                                        | New effect types needed                       |
| :------------------- | :----------------------- | :------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------- |
| **Obsidian Crystal** | sacrifice / retribution  | damage                           | Retribution (ally death → +power permanent); Blood Offering (`every_100_damage → heal self`); Sacrifice Synergy (`sacrifice_effect` → +power) | `on_ally_death` trigger (new)                 |
| **Void Crystal**     | disruption / power theft | decrease_power (strongest enemy) | Leech (enemy heal → your shield); Power Drain (`absorb_power`); Dispel                                                                        | `dispel` (D2)                                 |
| **Radiant Crystal**  | over-heal / overflow     | heal                             | Overflow Shield (`on_over_heal → shield`); Overflow Burst (`on_over_heal → damage enemy`); Saturation (`every_100_heal → increasePower`)      | none (reuses `on_over_heal`/`every_100_heal`) |
| **Echo Crystal**     | retrigger / echo         | damage                           | Echo (ally cast → repeat at reduced power); Resonance (row-ally cast → +power)                                                                | `repeat`/retrigger (C1)                       |
| **Verdant Crystal**  | thorns / revenge         | shield                           | Thorns (`on_crystal_hit → reflect`); Retaliation (enemy damage → +power)                                                                      | `on_crystal_hit` (C2)                         |

`Radiant Crystal` is the cheapest to build (no new effect types). The other four
pair naturally with the already-planned effect additions in the wacky-content
queue, so they're best scheduled after those effects land.
