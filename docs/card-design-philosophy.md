# Card Design Philosophy & Balance Guide

This document explains **why** Mana Battle's cards are designed the way they are —
the tier system, the upgrade curve, and the conventions every card must follow.

It is the companion to [unit-balance.md](unit-balance.md), which contains the
**mathematical** model (Actual Power per 5s, effect cost baselines, targeting
multipliers, trigger frequencies). Read both before adding or changing a card:
this file is the philosophy, that file is the arithmetic, and
`core/src/data/BaseCollection.balance.test.ts` is the enforcement.

## 1. The tier system

Every card has a `rank` which defines its tier:

| Rank | Tier | Role | Upgrade headroom (to max rank 4) |
| :--- | :--- | :--- | :--- |
| 1 | **Bronze** | Reliable base building blocks | **3** upgrades |
| 2 | **Silver** | Situational synergy units | **2** upgrades |
| 3 | **Gold** | Powerful build-around units | **1** upgrade |
| 4 | **Platinum** | Max rank — the terminal investment | — |

There are 92 non-core cards today: 61 bronze, 8 silver, 23 gold. The six cores
(`*_crystal`, `quickstone`) are rank-less `isCore` units and are not part of the
tier system.

### Bronze (rank 1) — the foundation

- **Self-contained, reliable kits.** A bronze unit performs well with no support:
  one basic action (damage/heal/shield/poison/regen) plus, at most, a simple
  reaction.
- **Budget ~90–110 AP.** Bronze is the only tier tuned to the 100-point budget
  in `unit-balance.md`. The whole game economy assumes bronze units are the
  baseline against which everything else is measured.
- Bronze that specialize (e.g. `living_armor`, `cleric`) are mildly conditional,
  but never require a specific board to function.

### Silver (rank 2) — situational synergies

- **Every silver unit has a reaction** (currently 8/8). Their power is locked
  behind a condition: "when an ally hastes", "when a column ally poisons",
  "when an enemy damages", etc.
- **Raw power cap 75.** Silver sits between bronze and gold in stats; its value
  comes from reading the board and activating the synergy, not from raw output.
- Silver is the tier where a single card *improves an existing archetype*
  (e.g. `thunder_core` charges its left ally and feeds haste-reactions).

### Gold (rank 3) — build-around

- **Every gold unit forces the rest of the board to adapt to it.** Its mechanics
  are engines, not upgrades: `allAlliesOfType("heal")`, `every_100_shield`
  thresholds, `on_battle_start` haste, cross-force `triggerTeam: "enemy"`
  reactions.
- **Raw power cap 90, but AP intentionally spikes when the engine is up.** A gold
  unit is deliberately over-budget *when its condition is met* and under-budget
  when it isn't — that is the build-around fantasy. The balance test uses wide
  gold AP bands for exactly this reason.
- Most golds are `locked: true` and are unlock rewards (achievements) or boss
  units. The five unlocked golds (`toxicologist`, `expedition_leader`,
  `vanguard`, `veteran_paladin`, `webert_the_old`) are the "chase" picks in
  gold shops.

### Platinum (rank 4) — terminal investment

The cap. No card can be upgraded past it (`rank < 4` in `recruitUnit`). A
platinum unit represents the maximum gold invested in one slot.

## 2. The upgrade curve (the central rule)

> **A bronze unit upgraded up to gold must have more power than a unit that
> starts at gold.**

This is the single most important balance rule in the game, and it is why bronze
has the most upgrade headroom:

- Bronze: 3 upgrades (rank 1 → 4)
- Silver: 2 upgrades (rank 2 → 4)
- Gold: 1 upgrade (rank 3 → 4)

**One unified upgrade model** is shared by duplicate buys, the upgrade orb, and
enemy generation (`upgradeUnitData` in `core/src/Entities/Unit.ts`):

- `rank += 1`
- `power = card.power × (rank − startingRank + 1) + bonusPower` (linear, not compounding)
- effect magnitudes scale with the same multiplier (`increase_power` amounts,
  `charge` durations, targeting counts)
- `maxLife × 1.5` per rank (cosmetic — only cores take damage in combat)

Consequence: a bronze with base power 50 reaches **150 power at rank 3** and
**200 at rank 4**; the strongest native gold is 80. The design intent is that
carrying a bronze unit through the run is a real investment that pays off —
"this bronze *is* my build" — while gold units win through unique mechanics, not
raw stats.

This rule is **enforced in the balance test**: `max bronze base × 3 ≥ max gold
base`. If a new gold card pushes this rule out, the test fails.

## 3. Balance logic at a glance

Full formulas live in [unit-balance.md](unit-balance.md) (AP = action power ×
cadence + reaction power, all normalized to a 5-second window). The per-tier
targets enforced by the test:

| Tier | Raw power cap | AP band (unlocked cards) |
| :--- | :--- | :--- |
| Bronze | 50 | 80 – 160 (mean ≈ 100) |
| Silver | 75 | 130 – 260 (mean ≈ 185) |
| Gold | 90 | 150 – 320 (mean ≈ 215) |

> Locked golds are excluded from the AP bands — their extreme reaction values
> are intentional boss/unlock design.

Key pricing rules (from `unit-balance.md`):
- Damage/heal = 2 × power, shield = 1.6 × power, poison/regen = 2 × power.
- Reactions are priced by **expected trigger frequency** (√sources × base
  frequency × 0.9 for the 200 ms reaction delay) — reaction spam has
  diminishing returns.
- Targeting uses √n multipliers (row/column ≈ 1.73, all allies ≈ 2.83).
- **Team-harming effects are negative value** (§9.1): buffing enemies or
  debuffing allies. These units are allowed to deviate from the band.

## 4. Authoring a card — checklist

When adding or editing a card in `core/src/data/BaseCollection.ts`:

1. **Pick a tier by setting `rank`** (1/2/3). Set `locked: true` for unlock/boss golds.
2. **Give it exactly one basic action** (damage/heal/shield/poison/regen).
3. **Stay within the slot cap**: ≤ 3 total (actions + reactions).
4. **Match the tier's AP band and raw power cap** for its rank.
5. **Reactions positioned on `"enemies"` MUST set `triggerTeam: "enemy"`**
   (otherwise they can never fire — this is a silent-bug trap the test guards).
6. **Never use position `"self"` with a non-global reaction** (the triggering
   unit is excluded from reaction candidates — it can never fire).
7. **Charge is a minor nudge, not an engine**: per-cast charge ≤ 300 ms, and a
   reaction that grants charge must key off a specific effect from a specific
   directional ally (never `"all"` or a whole row/column). See `unit-balance.md`
   §17.
8. **`multiply_power` is gold-only** with a cooldown ≥ 8000 ms (≤ 3 uses per
   30 s combat). See `unit-balance.md` §17.
9. **Reuse the builders** in `effectBuilders.ts` (`reaction`, `increasePower`,
   `allAlliesOfType`, …) so effects stay structurally valid and testable.
10. **Run the balance test**: `cd core && npm test`.
11. If the card intentionally violates the band (risk/flavor unit), add it to
    `AP_ALLOWLIST` in `BaseCollection.balance.test.ts` with a comment explaining why.

## 5. Shop & economy

- **Costs are tier-based**: bronze 10, silver 15, gold 25 (`getCardCost` in
  `OptionGeneration.ts`). A gold card in a wildcard shop is a real investment.
- **Shop availability** (`generateShopOptions`):
  - `silver_shop` → 2 silver options
  - `gold_shop` → 1 gold option
  - effect-typed encounters (armory, healing_tent, …) → bronze cards matching
    that effect only
  - wildcard encounters (`upgrade_unit`, `power_distributor`, `power_absorber`)
    → any tier, including rare gold draws at tier price

## 6. Flavor & risk exceptions

The game intentionally has a few cards that do not fit the budget model
(see `unit-balance.md` §9.1). Today that list is `gambler` (a crit battery whose
probabilistic payoff is hard to price). These are the exception, not the rule:
every such card must be allowlisted in the test with a written justification, so
the deviation is a conscious decision rather than an unnoticed regression.

## 7. Enforcement

`core/src/data/BaseCollection.balance.test.ts` is the source of truth for the
rules above. It checks:

- slot cap ≤ 3 and ≥ 1 basic action per card
- structural validity (no dead `"self"` reactions)
- `"enemies"` reactions set `triggerTeam: "enemy"`
- raw power caps per tier
- the bronze→gold upgrade-payoff rule (`max bronze base × 3 ≥ max gold base`)
- unlocked cards stay within their tier AP bands
- charge amounts ≤ 300 ms
- charge reactions key off a specific effect + directional ally
- `multiply_power` is gold-only with a cooldown ≥ 8000 ms

If you change a card's numbers, the test tells you immediately whether it is in
band. Keep it green.

