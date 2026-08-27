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

There are 92 non-core cards today: 61 bronze, 21 silver, 10 gold. The six cores
(`*_crystal`, `quickstone`) are rank-less `isCore` units and are not part of the
tier system.

> **Silver pool** (21 cards) outnumbers the gold pool (10) by design — silver is
> the situational-synergy tier that enables archetype pivots, so it needs
> breadth; gold is the rare build-around tier, so it must stay scarce.
> The balance test enforces `silvers > golds` and `golds ≤ 10`
> (see `BaseCollection.balance.test.ts`). See
> [card-system-risks-and-roadmap.md](card-system-risks-and-roadmap.md) §1.

### Bronze (rank 1) — the foundation

- **Self-contained, reliable kits.** A bronze unit performs well with no support:
  at least one basic effect (damage/heal/shield/poison/regen — the **basic
  types**) plus, at most, a simple reaction.
- **Budget ~90–110 AP.** Bronze is the only tier tuned to the 100-point budget
  in `unit-balance.md`. The whole game economy assumes bronze units are the
  baseline against which everything else is measured.
- Bronze that specialize (e.g. `living_armor`, `cleric`) are mildly conditional,
  but never require a specific board to function.

> **The awaken payoff (2026-08-26).** Bronze units that reach gold (rank 3)
> trigger the [awaken phase](awaken.md): the player picks one of three random
> reactions to permanently add to the unit. This is the bronze tier's answer to
> the "silvers and golds are defined by their reactions" identity — a fully
> invested bronze unit earns the same kind of ability-granting power, so the
> bronze→silver→gold journey is a transformation, not just a stat bump.

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
- **Gold balance cannot be fully automated.** The wide AP bands mean the balance
  test trusts designer judgment on engine feasibility. A gold with a reaction
  that requires a specific effect type may be mathematically in-band but
  practically useless if the card pool lacks enough enablers. Every gold card
  must pass the **gold feasibility checklist** (§3.1) before it is accepted.

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

### 3.1. Gold feasibility checklist

Because gold cards sit outside tight AP bands by design, every gold must pass
a manual feasibility review that the automated balance test cannot perform:

1. **Enabler count**: how many non-core, unlocked cards in the pool produce the
   effect this gold's engine requires? If the answer is < 3, the gold is a
   dead draw in most runs. (Example: a gold keying off `every_100_regen` on a
   pool with only 2 regen cards is unacceptable.)
2. **Enabler tier distribution**: are the enablers all gold, or are there
   bronze/silver enablers? If the enablers are all gold themselves, the engine
   requires two gold draws to function — too rare.
3. **Worst-case AP**: compute the gold's AP assuming zero engine triggers. This
   is the "brick" value when the player cannot activate the synergy. If it is
   < 60 AP (below a weak bronze), the gold is a trap pick that costs 25g and
   a shop slot. Consider raising its base power or giving it a fallback effect.
4. **Best-case AP sanity check**: compute AP assuming the engine fires at the
   maximum mathematically possible frequency (all 8 allies producing the
   trigger effect). If this exceeds ~500 AP, the engine likely spirals and
   should be dampened (longer cooldown, cap on stacks, or narrower trigger).
5. **Shop visibility**: does the gold rely on a specific effect type that the
   player can target via encounter choices (e.g. armory for damage, healing_tent
   for heal)? If no typed encounter provides its enablers, the player has no
   agency to build toward it — the gold is pure RNG.

If a gold fails any of these checks, either adjust its numbers, widen its
trigger condition, add enabler cards to the pool, or add a matching shop
encounter. Do not ship a gold that only works in theory.

### 3.2. Disruption & counterplay (future design space)

The current trigger system has no purge, dispel, silence, or counter-synergy
mechanics. A shield-stacking composition has no predator except a raw DPS check;
a poison-synergy board has no counter except out-racing it. This is acceptable
for PvE, but as multiplayer is added ([game-server.md](game-server.md)) the lack
of disruption mechanics means the meta will converge to a few dominant synergy
packages with no checks.

Candidate disruption effects for future design exploration:

| Effect | Mechanic | Design notes |
| :--- | :--- | :--- |
| `purge` | Removes all shield/poison/regen stacks from target crystal | Counters shield-stacking and DoT-heavy boards |
| `silence` | Prevents target unit from triggering reactions for N seconds | Direct counter to silver/gold synergy engines |
| `taunt` | Forces enemy effects to target this unit's crystal | Protective tool for fragile compositions |
| `reflect` | Returns X% of received damage as a one-time hit | Punishes glass-cannon damage boards |
| `mana_burn` | Reduces target crystal's max life by N for this combat | Anti-tank tool against high-life compositions |

These should be **silver-tier effects** (situational answers, not general-use
tools) so they reward reading the opponent's board rather than becoming default
picks. A `purge` silver in a shop against a shield-stacking enemy board is a
meaningful strategic decision; a `purge` bronze that everyone auto-includes is
not.

See the roadmap in [card-system-risks-and-roadmap.md](card-system-risks-and-roadmap.md) §3.

### 3.3. Positional design depth (underexploited)

The 3×3 grid is the game's spatial constraint, but card designs currently use
position primarily as a cost multiplier for reactions (row/column/directional).
The grid can carry more design weight:

- **Front-row / back-row roles**: units in row 0 (front) could have distinct
  identities from row 2 (back) — e.g. front-row units have higher base life,
  back-row units have longer cooldowns but stronger effects.
- **Adjacency bonuses**: effects that scale with the number of adjacent allies
  (max 4 for center slot, 2 for edge, 1 for corner) reward thoughtful placement.
- **Positional threats**: enemy effects that target "strongest in row" or
  "weakest in column" force the player to arrange their board defensively.
- **Column/row archetypes**: a column of all-shield units, a row of all-damage
  units — the grid becomes a composition mini-game, not just a container.

These are lower-priority than filling the silver pool and adding disruption,
but worth considering as the card pool grows beyond 100+ cards.

## 4. Authoring a card — checklist

When adding or editing a card in `core/src/data/BaseCollection.ts`:

1. **Pick a tier by setting `rank`** (1/2/3). Set `locked: true` for unlock/boss golds.
2. **Give it at least one basic effect** (damage/heal/shield/poison/regen — the
   **basic types**). Every unit needs a basic-type effect at the core of its kit;
   units may carry more than one (e.g. `lifestealer` deals damage *and* heals).
3. **Stay within the slot cap**: ≤ 3 total (actions + reactions).
4. **Match the tier's AP band and raw power cap** for its rank.
5. **Write its designer metadata** — a one-line `description` (goal, archetype,
   when it shines) and `tags` from the `CARD_TAGS` vocabulary (§4.1). This is an
   authoring aid, not enforced, but it keeps the pool's archetype coverage
   reviewable and forces intent before numbers.
6. **Reactions positioned on `"enemies"` MUST set `triggerTeam: "enemy"`**
   (otherwise they can never fire — this is a silent-bug trap the test guards).
7. **Never use position `"self"` with a non-global reaction** (the triggering
   unit is excluded from reaction candidates — it can never fire).
8. **Charge is a minor nudge, not an engine**: per-cast charge ≤ 300 ms, and a
   reaction that grants charge must key off a specific effect from a specific
   directional ally (never `"all"` or a whole row/column). See `unit-balance.md`
   §17.
9. **`multiply_power` is gold-only** with a cooldown ≥ 8000 ms (≤ 3 uses per
   30 s combat). See `unit-balance.md` §17.
10. **Reuse the builders** in `effectBuilders.ts` (`reaction`, `increasePower`,
    `allAlliesOfType`, …) so effects stay structurally valid and testable.
11. **Run the balance test**: `cd core && npm test`.
12. If the card intentionally violates the band (risk/flavor unit), add it to
    `AP_ALLOWLIST` in `BaseCollection.balance.test.ts` with a comment explaining why.

### 4.1. Designer metadata — `description` + `tags`

Every non-core card carries two optional, **authoring-only** fields on its
`CardDefinition` (`core/src/types/card.ts`). They exist to guide the designer,
are never read at runtime, and are never enforced by tests:

- **`description`** — one line stating the card's intent: its goal, its
  archetype, and when it shines. Writing it forces the author to articulate
  *why* the card exists rather than just *what* it does.
- **`tags`** — archetype labels from the closed `CARD_TAGS` vocabulary:
  `grow_over_time`, `disabler`, `charger`, `haster`, `crit_battery`,
  `type_engine`, `cross_force`, `power_redistribution`, `risk_reward`,
  `team_buff`. A card may carry multiple tags.

Use tags to keep the pool reviewable at a glance — e.g. "we have 12
`grow_over_time` cards but only 2 `disabler`s" is a signal to rebalance, and a
new card whose tags don't match an existing archetype (or don't fit the tier's
role) should be reconsidered before it ships.

## 5. Shop & economy

Mana Battle has **no gold or in-run currency**. The `getCardCost` values (10/15/25)
in `OptionGeneration.ts` are display-only tier indicators — no gold is tracked,
deducted, or accumulated during a session. The encounter slot is the economy.

**Design rationale**: Gold adds a second balancing dimension (income, prices,
hoarding, interest) without adding meaningful decisions to a game where the core
choice is already "which of these 1–3 cards do I place on my 3×3 grid?" Each round
has exactly 3 encounter slots — every card costs exactly "1 encounter pick,"
regardless of tier. The tier difference manifests as **fewer options** (1 gold vs
3 bronze) and **rarer appearance** (gold shop unlocks at round 6), not as a price
the player must budget for. A gold that costs gold you don't have is pure
frustration; a gold that costs "your one pick this encounter" is a strategic
trade-off. See [encounter-system.md](encounter-system.md) §8 for the full design
discussion.

- **Shop availability** (`generateShopOptions`):
  - `silver_shop` → 2 silver options
  - `gold_shop` → 1 gold option
  - effect-typed encounters (armory, healing_tent, …) → bronze cards matching
    that effect only
  - wildcard encounters (`upgrade_unit`, `power_distributor`, `power_absorber`)
    → any tier

## 6. Flavor & risk exceptions

The game intentionally has a few cards that do not fit the budget model
(see `unit-balance.md` §9.1). Today that list is `gambler` (a crit battery whose
probabilistic payoff is hard to price). These are the exception, not the rule:
every such card must be allowlisted in the test with a written justification, so
the deviation is a conscious decision rather than an unnoticed regression.

**A single allowlist entry is too few.** The AP model is a linear approximation
of a non-linear system — risk/reward, probabilistic payoffs, and timing-sensitive
effects are inherently difficult to price. Having only `gambler` in the allowlist
suggests the design space may be overly constrained by the model. Actively
encourage risk/flavor designs, especially at silver and gold tiers:

- **Silver risk cards**: a silver that gains power *only* when its reaction fires
  but carries a stat penalty otherwise. The AP model prices it as under-budget,
  but it creates a high-agency "do I enable this?" decision.
- **Gold risk cards**: a gold with a powerful effect that also harms the owner
  (negative-value effects from `unit-balance.md` §9.1). The model handles
  team-harming effects naturally (they produce low/negative AP), so these are
  test-safe by construction.
- **Probabilistic effects**: crit-based engines, "X% chance to double cast"
  effects — the model's `on_crit` base frequency (0.4) is a coarse average.
  Cards built around crit variance may need allowlisting with a note on their
  expected payoff distribution.

The `AP_ALLOWLIST` is not a shame-list; it is a documentation of intentional
design choices. A healthy card pool should have **5–10** allowlist entries across
92+ cards, each with a concise justification. If the pool grows to 150 cards and
the allowlist still has 1 entry, the model is suffocating the design space.

## 7. Enforcement

`core/src/data/BaseCollection.balance.test.ts` is the source of truth for the
rules above. It checks:

- slot cap ≤ 3 and ≥ 1 basic effect per card (every unit, cores included)
- structural validity (no dead `"self"` reactions)
- `"enemies"` reactions set `triggerTeam: "enemy"`
- raw power caps per tier
- the bronze→gold upgrade-payoff rule (`max bronze base × 3 ≥ max gold base`)
- unlocked cards stay within their tier AP bands
- charge amounts ≤ 300 ms
- charge reactions key off a specific effect + directional ally
- `multiply_power` is gold-only with a cooldown ≥ 8000 ms
- more silvers than golds, with at most 10 golds (tier-distribution guard)

If you change a card's numbers, the test tells you immediately whether it is in
band. Keep it green.


**What the test cannot enforce** (these require manual review per §3.1 and
[card-system-risks-and-roadmap.md](card-system-risks-and-roadmap.md)):

- Whether a gold card's engine condition is actually achievable with the
  available card pool (enabler count, tier distribution)
- Whether a silver card's reaction trigger is too rare or too common in practice
  (composition-dependent variance)
- Whether a permanent-power unit is viable in its first combat or a trap pick
- Whether the golden path (the most common sequence of shops/upgrades a player
  sees) provides enough opportunity to activate each silver/gold

These should be reviewed during card authoring and revisited whenever the card
pool changes.

