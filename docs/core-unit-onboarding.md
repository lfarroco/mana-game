# Core Unit Onboarding & Themed Upgrades

> Approved design (2026-08-19). Companion to
> [card-design-philosophy.md](card-design-philosophy.md),
> [unit-balance.md](unit-balance.md), and
> [encounter-system.md](encounter-system.md).

Core units ("crystals") are the first unit the player picks and the anchor of
their playstyle. Each carries an implicit **theme** (its signature action family —
a basic-effect type for most cores; `quickstone` leads with `haste`). Today each
core ships with **two effects + zero reactions** — one basic action (the absolute
basic-effect rule, docs/unit-balance.md §14) plus one simple, direct action
(haste / slow / power deltas / a second basic) that fits its theme — so the first
card a new player reads stays short and every starting kit is unique (the
2026-08-28 basic-crystal balance pass normalized all 9 cores to ~100 AP, removing
the old single-effect duplicates such as heal-only × 2 and shield-only × 2).
Their depth lives in **theme-scoped upgrade orb events** the player chooses over
the run.

---

## 1. Decisions (approved)

| #   | Decision                                                                                                                                            |
| :-- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Simpler at start is better.** Baseline core = one basic effect + one simple action (haste / slow / power deltas / a second basic) + stats, and **no reactions** — crystals must stay simple. The secondary buffs and reactions move into the themed upgrade pool.    |
| 2   | **Enemies use the same simplified cores.** Difficulty is restored by scaling enemy power/life by round in `generateEnemyTeam.ts`.                   |
| 3   | **Cores get a higher AP ceiling.** A separate core AP band (not the bronze `[80, 160]` band) — cores are allowed to be stronger than regular units. |
| 4   | **`quickstone` keeps `haste` as its theme** and pairs it with `regen` in the baseline — the absolute basic-effect rule (every unit, cores included, needs ≥ 1 `damage`/`heal`/`shield`/`poison`/`regen` effect, docs/unit-balance.md §14) requires a basic effect even on cores, so `regen` (quickstone's historical "refresh" partner) stays in the kit and is dropped from the identity-orb pool. |
| 5   | **Basic + simple kits (2026-08-28).** Every core ships exactly two effects — one basic action plus one theme-fitting simple action — and all 9 cores are stat-normalized to ~100 AP per 5s (`content/coreUpgrades.balance.test.ts`), so no starting kit is a strict duplicate of another. |

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

Each core's `coreTheme` names its **signature action family** (a basic-effect
type for five cores; `haste` for `quickstone`). Since the 2026-08-28 balance pass
every core's baseline is exactly **one basic action + one simple action**:

| Core                 | `coreTheme` | Basic action | Simple action            |
| :------------------- | :---------- | :----------- | :----------------------- |
| `mana_crystal`       | `regen`     | regen        | +5 power to column       |
| `critical_crystal`   | `damage`    | damage       | slow strongest enemy 1s  |
| `protective_crystal` | `shield`    | shield       | +5 power to row          |
| `growth_crystal`     | `heal`      | heal         | +4 power to self         |
| `purple_crystal`     | `poison`    | poison       | slow random enemy 1s     |
| `quickstone`         | `haste`     | regen        | haste row 1s             |

> Note: the absolute basic-effect rule (docs/unit-balance.md §14) requires every
> unit — cores included — to carry at least one `damage`/`heal`/`shield`/`poison`/
> `regen` effect, so a support-themed core pairs its theme action with a basic
> effect (e.g. `quickstone` pairs `haste` with `regen`). Core _themes_ stay 1:1
> with action families; the rule only guarantees a basic effect on every unit, not
> that each basic type appears on exactly one core.

---

## 3. Baseline cores (simplified)

Each core ships a minimal two-effect kit — one basic effect plus its theme's
simple action (2026-08-28 balance pass). Stat lines are normalized so every core
prices to ~100 AP per 5s (`content/coreUpgrades.balance.test.ts`), removing the
old single-effect duplicates. Everything else moves into the themed upgrade pool
(§4); enemy scaling (§6) absorbs the early-power gap.

| Core                 | Baseline effects (basic + simple)             | Removed → becomes an identity orb                                                                                 |
| :------------------- | :-------------------------------------------- | :---------------------------------------------------------------------------------------------------------------- |
| `mana_crystal`       | `[regen, increasePower(5, column)]`           | `increasePower(10, column)` (baseline upgrade); reaction `damage ← left_ally → charge(self)`                      |
| `critical_crystal`   | `[damage, slow(1000, strongestEnemy)]`        | `increaseCritical(5, column)`; reaction `all ← row_allies → +5 power (column)`                                    |
| `protective_crystal` | `[shield, increasePower(5, row)]`             | `increasePower(5, randomAlly, permanent)`; reaction `all ← row_allies → +5 power (trigger)`                       |
| `growth_crystal`     | `[heal, increasePower(4, self)]`              | `increasePower(2, column, permanent)`; reaction `all ← row_allies → +5 power (trigger)`                           |
| `purple_crystal`     | `[poison, slow(1000, randomEnemy)]`           | `slow(1000, randomEnemy)` moved to baseline (2026-08-28), replaced by `poison_re_slow_haste`; reaction `slow ← allies → +4 power (trigger, permanent)` |
| `quickstone`         | `[regen, haste(1000, row)]`                   | reaction `haste ← right_ally → charge(200, column)`                                                              |

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

| Theme                 | Identity orbs                                                                                                                                                                                                                                                                                                                                                                                                 |
| :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `regen` (mana)        | Column Growth (`increasePower(10, column)`); Reactive Charge (`damage ← left_ally → charge self`); Overflow Shield (`on_over_heal → shield`); Regen Charge (`every_10_regen → charge random ally`); Regen Growth (`every_10_regen → +5 power self`); Regen Haste (`every_10_regen → haste random ally`); Mana Weave (`increasePower(2, column, permanent)`); Regen Venom (`every_10_regen → poison enemy`); Reactive Ward (`damage ← left_ally → shield`) |
| `damage` (critical)   | Crit Column (`increaseCritical(5, column)`); Row Power (`all ← row_allies → +5 power column`); Crit Power (`on_crit → increasePower`); Crit Slow (`on_crit → slow enemy`); Damage Power (`every_100_damage → +5 power self`); Crit Haste (`on_crit → haste random ally`); Crit Weaken (`on_crit → −4 power random enemy`); Crit Thorns (`on_crystal_hit → damage back`); Crit Siphon (`on_crit → steal strongest enemy power`) |
| `shield` (protective) | Shield Ally Power (`increasePower(5, randomAlly, permanent)`); Shield Trigger Power (`all ← row_allies → +5 power trigger`); Shield Power (`every_100_shield → increasePower`); Overflow Shield (`on_over_heal → shield`); Shield Haste (`every_100_shield → haste random ally`); Shield Charge (`every_100_shield → charge random ally`); Bastion (`increasePower(5, weakestAlly, permanent)`); Repair (`heal → shield`); Retribution (`on_crystal_hit → +3 permanent power self`) |
| `heal` (growth)       | Growth Column (`increasePower(2, column, permanent)`); Growth Trigger (`all ← row_allies → +5 power trigger`); Overflow Power (`on_over_heal → increasePower`); Heal Power (`every_100_heal → increasePower`); Heal Charge (`every_100_heal → charge random ally`); Heal Haste (`every_100_heal → haste random ally`); Vitality (`increasePower(5, self, permanent)`); Second Wind (`on_crystal_hit → heal`); Purifying (`every_100_heal → dispel strongest enemy`) |
| `poison` (purple)     | Slow Enemy (`slow(1000, randomEnemy)`); Slow Power (`slow ← allies → +4 power trigger, permanent`); Poison Power (`every_10_poison → increasePower`); Re-Slow Drain (`re_slow → decrease enemy power`); Poison Haste (`every_10_poison → haste random ally`); Poison Charge (`every_10_poison → charge random ally`); Venom Drain (`slow → −4 power random enemy`); Plague (`on_crit → poison enemy`); Revenge (`enemy every_10_poison → strongest enemy −3 power`) |
| `haste` (quickstone)  | Haste Charge (`haste ← right_ally → charge column`) — Regen moved into the baseline (basic-effect rule); Re-Haste Crit (`re_hasted → increaseCritical`); Re-Haste Power (`re_hasted → +5 power self`); Haste Power (`haste → +4 power trigger, permanent`); Haste Charge (`haste → charge random ally`); Speed Column (`haste(1000, column)`); Haste Slow (`haste → slow random enemy`); Clockwork (`slow ← allies → charge the slowed ally 150ms`) |

> **Variety pass (2026-08-25):** every theme's pool gained 3 identity orbs
> (listed above; `overflow` / `thorns` / `void` additions are described in §9
> alongside their cores). Pools are now 7 identity orbs per theme (6 for
> `haste`) + the 3 generic stat orbs, so each `upgrade_core` /
> `add_reaction_core` event draws its 3 choices from a much larger, more varied
> set.
>
> **Variety pass 2 (2026-08-30):** every theme's pool gained 2 more identity
> orbs — cross-mechanic responses (poison/shield/regen/dispel/silence/absorb)
> and new triggers (`on_crystal_hit`, `heal`, `on_crit`, `slow`) instead of
> more `every_X → charge/haste/power` template orbs. Pools are now 9 identity
> orbs per theme (8 for `haste`) + the 3 stat orbs (80 identity orbs total).
> The dilution plus response variety makes degenerate stacks (e.g. the regen
> tempo trio of Regen Charge/Growth/Haste) much harder to assemble, and the
> combat runaway guard (docs/combat-system-improvements.md §1.2) keeps any
> leftover combo bounded.

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

- [x] **CUB-A1** (2026-08-19, `94cd10a9`) — add `CoreTheme` + `CORE_THEMES` + `coreTheme` to `CardDefinition` (`core/src/types/card.ts`).
- [x] **CUB-A2** (2026-08-19, `91c40f9e`) — set `coreTheme` on all 6 cores; reduce each to its action-only baseline per §3 (`core/src/data/cards/coreCards.ts`); quickstone baseline → `haste(1000, row)`. *(2026-08-24: the basic-effect rule later restored `regen` to quickstone's baseline — see decision 4.)*
- [x] **CUB-A3** (2026-08-19, `ac6b7ab5`) — create `core/src/content/coreUpgradeOrbs.ts` with `CoreUpgradeDefinition` + the per-theme catalog (§4), reusing existing reaction orbs where possible.

### Phase B — generation & application (`core/`)

- [x] **CUB-B1** (2026-08-19, `8260536e`) — `generateCoreUpgradeOptions(session)` in `SessionTransitions.ts`: theme-scoped, seeded/deterministic, dedupes applied orbs, honors `minRound`.
- [x] **CUB-B2** (2026-08-19, `8260536e`) — wire themed options into the `upgrade_core` and `add_reaction_core` transitions (replace static `UPGRADE_CORE_OPTIONS` / `ADD_REACTION_CORE_OPTIONS`).
- [x] **CUB-B3** (2026-08-19, `54b466df`) — extend `OrbAndCoreUpgrades` to apply `CoreUpgradeDefinition` (append effect/reaction, or call the stat helpers).

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

- [x] **CUB-G1** — **Radiant Crystal landed (2026-08-19)**: new `overflow` theme core
  (heal baseline, P40/CD5000) + 4 identity orbs (Overflow Shield/Burst, Saturation,
  Overflow Charge) with theme-scoped generation, balance gate, combat tests, and
  i18n (all locales). See §9 for the remaining candidate cores.

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
| **Void Crystal**     | disruption / power theft | damage + decrease_power (strongest enemy) | Leech (enemy heal → your shield); Power Drain (`absorb_power`); Dispel                                                                        | `dispel` (D2)                                 |
| **Radiant Crystal**  | over-heal / overflow     | heal                             | Overflow Shield (`on_over_heal → shield`); Overflow Burst (`on_over_heal → damage enemy`); Saturation (`every_100_heal → increasePower`)      | none (reuses `on_over_heal`/`every_100_heal`) |
| **Echo Crystal**     | retrigger / echo         | damage                           | Echo (ally cast → repeat at reduced power); Resonance (row-ally cast → +power)                                                                | `repeat`/retrigger (C1)                       |
| **Verdant Crystal**  | thorns / revenge         | shield                           | Thorns (`on_crystal_hit → reflect`); Retaliation (enemy damage → +power)                                                                      | `on_crystal_hit` (C2)                         |

> ✅ **Radiant Crystal landed 2026-08-19 (CUB-G1)** as the `overflow` theme
> (added to `CORE_THEMES`) with `radiant_crystal` (baseline `heal` + self-haste —
> the 2026-08-28 balance pass added `haste(1000, self)` so the crystal pulses
> faster, feeding its overflow identity — power 43 / cooldown 5000) and four
> identity orbs: Overflow Shield, Overflow Burst
> (`on_over_heal → damage`), Saturation, and Overflow Charge. Its theme is the
> first non-basic-action identity theme — the overflow family is still
> heal-based, but its orb pool is scoped separately from `growth_crystal`'s
> `heal` pool. The 2026-08-25 variety pass added Radiance (`on_over_heal → +5
> power weakest ally, permanent`), Overflow Haste, and Overflow Slow.
>
> ✅ **Verdant Crystal landed 2026-08-19 (CUB-G2)** as the `thorns` theme
> (added to `CORE_THEMES`) with `verdant_crystal` (baseline `shield` + `damage` —
> the 2026-08-28 balance pass gave it a second basic action as the closest a
> no-reaction kit gets to its retaliate identity — power 28 / cooldown 5000, the
> tankiest crystal at 550 life) and four identity orbs —
> Thorns (`on_crystal_hit → damage` reflect), Thorn Shield (`on_crystal_hit →
> shield`), Retaliation (`on_crystal_hit → +5 power`), Vengeful Charge
> (`on_crystal_hit → charge random ally`). It reuses the C2 `on_crystal_hit`
> reaction landed in the wacky-content queue (Thornback) — the crystal itself
> carries the thorns reaction and punishes whoever lands a hit on it. The
> 2026-08-25 variety pass added Thorn Growth (`on_crystal_hit → +4 power self,
> permanent`), Thorn Slow, and Thorn Haste.
>
> ✅ **Void Crystal landed 2026-08-19 (CUB-G3)** as the `void` theme (added to
> `CORE_THEMES`) with `void_crystal` (baseline `damage` + `decrease_power(10)` on
> the strongest enemy; the 2026-08-28 balance pass normalized its power 20 → 30
> so the 2-effect kit prices to ~100 AP like the other cores) and four identity
> orbs — Leech
> (enemy heal → shield the crystal), Power Drain (`absorb_power`), Dispel (the
> D2 status-stripper), and Weakness (ally basic cast → −5 power on the
> strongest enemy). The disruption/power-theft crystal gives the D2 `dispel`
> effect its core home. The 2026-08-25 variety pass added Power Sap
> (`decrease_power(8, strongest enemy)` per cast), Shadow Slow (ally basic cast
> → slow the strongest enemy), and Shadow Haste (ally basic cast → haste self).

`Radiant Crystal` was the cheapest to build (no new effect types) and is now in
the game. `Verdant Crystal` followed once the C2 `on_crystal_hit` effect landed
(CUB-G2), then `Void Crystal` once D2 `dispel` landed (CUB-G3). The remaining
two pair with the already-planned effect additions in the wacky-content queue
(Obsidian still needs the `on_ally_death` trigger; Echo can now reuse C1's
`repeat`), so they're best scheduled after those effects land.
