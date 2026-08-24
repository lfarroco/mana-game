# New Encounter Types — Design Catalog

> Generated 2026-08-17. Elaborates [encounter-system.md](encounter-system.md)
> (§9 Balatro, §10 The Bazaar) into a concrete, implementation-ready catalog.
> Companion to [card-design-philosophy.md](card-design-philosophy.md) and
> [card-system-risks-and-roadmap.md](card-system-risks-and-roadmap.md).

This document:
1. Re-states the current encounter list and its gaps (verified against code).
2. Maps Balatro pack categories and The Bazaar encounter categories onto Mana
   Battle mechanics.
3. Elaborates ~20 new encounter types, each with mechanism spec, exact engine
   hooks, round gate, availability window, and effort.
4. Schedules every encounter turn-by-turn (§4) and redesigns the silver/gold
   gates as **win-checkpoint + event-driven unlocks**, replacing today's
   equal-weight random pool where `silver_shop`/`gold_shop` can appear at
   round 1 with the same odds as any bronze shop.
5. Lists the new engine primitives required (so implementation effort is
   honest), and a sequencing plan (P1/P2/P3).

All code references were verified against `core/src/` at the time of writing.

---

## 1. Current state (verified)

### 1.1. Live encounters (15) — `core/src/session/OptionGeneration.ts` `ENCOUNTERS`

| #  | ID                  | Filter                     | Options | Cost display | Routes to                           |
|:---|:--------------------|:---------------------------|:--------|:-------------|:------------------------------------|
| 1  | `upgrade_unit`      | — (orb)                    | 3       | —            | `orb_shop` → `upgrade_orb`          |
| 2  | `armory`            | bronze `damage`            | 3       | 10           | `shop`                              |
| 3  | `healing_tent`      | bronze `heal`              | 3       | 10           | `shop`                              |
| 4  | `frontier_fort`     | bronze `shield`            | 3       | 10           | `shop`                              |
| 5  | `forest_pools`      | bronze `regen`             | 3       | 10           | `shop`                              |
| 6  | `toxic_chamber`     | bronze `poison`            | 3       | 10           | `shop`                              |
| 7  | `trial_circuit`     | bronze `haste`             | 3       | 10           | `shop`                              |
| 8  | `trappers_guild`    | bronze `slow`              | 3       | 10           | `shop`                              |
| 9  | `thunder_spire`     | bronze `charge`            | 3       | 10           | `shop`                              |
| 10 | `commanders_tent`   | bronze `increase_power`    | 3       | 10           | `shop`                              |
| 11 | `assassins_hideout` | bronze `increase_critical` | 3       | 10           | `shop`                              |
| 12 | `power_distributor` | — (orb)                    | 3       | —            | `orb_shop` → `distribute_power_orb` |
| 13 | `power_absorber`    | — (orb)                    | 3       | —            | `orb_shop` → `absorb_power_orb`     |
| 14 | `silver_shop`       | silver (rank 2)            | 2       | 15           | `shop`                              |
| 15 | `gold_shop`         | gold (rank 3)              | 1       | 25           | `shop`                              |
| 16 | `gamblers_shrine` (A3, new) | — (orb)            | —       | —            | `orb_shop` → `sacrifice_effect_orb` |
| 17 | `dark_ritual` (A1, new)     | — (orb)            | —       | —            | `orb_shop` → `sacrifice_unit_orb`   |
| 18 | `scrap_salvage` (B2, new)   | — (orb)            | —       | —            | `orb_shop` → `scrap_salvage_orb`    |
| 19 | `rest_inn` (C1, new)        | — (no shop)        | —       | —            | advance (restores 1 loss)           |
| 20 | `soul_trade` (A2, new)      | gold (rank 3)      | 1       | —            | `shop` (lose 1 loss)                |
| 21 | `runesmith_damage` (F1, new) | silver reaction-damage | 2    | 15           | `shop`                              |
| 22 | `runesmith_shield` (F1, new) | silver reaction-shield | 2    | 15           | `shop`                              |
| 23 | `runesmith_heal` (F1, new)   | silver reaction-heal  | 2    | 15           | `shop`                              |

Implemented 2026-08-19 as the P1 slice of [§6](#6-sequencing) (A1/A2/A3/C1/B2/F1 —
round-firewall enforcement included, see §1.2).

Plus 5 dead entries (`improve_damage/heal/shield/poison/regen`) in
`core/src/content/encounters.ts` with no `OptionGeneration` counterpart.

### 1.2. Structural facts that constrain design

- `filterCardsByEffect` hard-filters effect-typed encounters to `rank === 1`
  (bronze). Silvers/golds never appear through typed shops.
- `silver_shop`/`gold_shop` round gating (`minRound`/`maxRound` in
  `content/encounters.ts`) was **not enforced** by `createEncounterOptions` —
  the two tier shops were equal-weight pool members, so a gold shop could
  appear at round 1 as often as a bronze shop (and, because of the 12-slot
  recency exclusion, could also miss an entire run). §4.3 redesigns this into
  wave-split pools; as an interim step (2026-08-19) `createEncounterOptions`
  now **enforces** `minRound`/`maxRound` as a round firewall over the whole
  pool, which also gates the P1 encounters added below.
- Wildcard encounters give an orb **and no card shop** (the slot is consumed).
- `skip` in any non-combat phase advances a step and gives nothing.
- `LOSSES_TO_GAME_OVER = 4` is the only "life" counter; nothing restores it.
- No multi-option reward in a single slot (no Balatro-style "pack has N picks").
- Encounter history window is fixed at `history.slice(-12)`; pool is 15 →
  recycle every ~5 encounter picks.

### 1.3. Design gaps (documented in encounter-system.md §5/§9/§10)

| Gap                                                                        | Reference          |
|:---------------------------------------------------------------------------|:-------------------|
| No risk/reward encounters                                                  | §9.2/§9.4, §10.2.3 |
| No upgrade/manipulation of owned units                                     | §10.2.1            |
| No health/life interaction                                                 | §10.2.2            |
| No skip payoff                                                             | §9.2 Tags          |
| No strategy-leveling ("Celestial" equivalent)                              | §9.2               |
| No reaction/synergy-filtered shops (silver identity)                       | §5.4               |
| No multi-slot reward (hub)                                                 | §9.2               |
| Tier shops are equal-weight random draws; `minRound`/`maxRound` unenforced | §5.1, §4.3         |

---

## 2. Design lineage

### 2.1. Balatro pack categories → Mana Battle mapping

| Balatro pack  | Core idea                                              | Mana Battle today                          | New encounters below                                                |
|:--------------|:-------------------------------------------------------|:-------------------------------------------|:--------------------------------------------------------------------|
| **Arcana**    | Modify individual cards (suit, enhance, destroy, copy) | `upgrade_unit` orb, distribute/absorb orbs | `gamblers_shrine`, `scrap_salvage`, `reforge`, `duplicator`         |
| **Celestial** | Level up your existing strategy                        | `upgrade_core` phase (3 static options)    | `tome_of_*`, `blessing`                                             |
| **Standard**  | Add foundation cards                                   | 10 bronze-filtered shops                   | works; add silvers via `runesmith`/`reaction_lab`                   |
| **Spectral**  | High-risk/high-reward                                  | —                                          | `dark_ritual`, `soul_trade`, `double_or_nothing`, `gamblers_shrine` |
| **Buffoon**   | Scoring engines (new build-arounds)                    | `silver_shop`/`gold_shop`, wildcards       | `runesmith`, `reaction_lab`                                         |
| **Tags**      | Skipping pays later                                    | skip = wasted slot                         | `favor`, `sealed_vault`                                             |
| **Shop**      | Multi-category hub                                     | —                                          | `crossroads` (mini-hub)                                             |

### 2.2. The Bazaar categories → Mana Battle mapping

| Bazaar category        | Example                     | Mana Battle equivalent today               |
|:-----------------------|:----------------------------|:-------------------------------------------|
| Shops (typed)          | Armory, Botanical Gardens   | ✓ 10 typed bronze shops                    |
| Upgrades & enchanting  | The Artist, Forja, Form     | ✗ only the 3 orb wildcards                 |
| Gold & economy         | Cache of Riches, Invest     | ✗ (no gold — deliberate, §8)               |
| Health & survivability | Hospital, Relax, Tincture   | ✗ none                                     |
| Risk & reward          | Borrow, Strange Mushroom    | ✗ none                                     |
| Combat events          | Battlefield, Bounty Hunters | ✗ (rejected: mandatory combat is identity) |
| Minigames              | Fishing, Racetrack          | ✗ (rejected)                               |
| Exploration            | Jungle Ruins                | ✗ (re-skinned shops — no need)             |
| Named NPCs             | Aldric, Dabora              | ✗ (no character system)                    |

---

## 3. The catalog (A–G)

Categories:
- **A. Risk & reward** — Spectral lineage / Bazaar risk.
- **B. Upgrade & manipulation** — Arcana + Bazaar enchanting lineage.
- **C. Health & survivability** — Bazaar health lineage.
- **D. Strategy leveling** — Celestial lineage.
- **E. Skip payoff** — Tags lineage.
- **F. Archetype & reaction shops** — closes §5.3/§5.4.
- **G. Choice-of-reward** — standard pack lineage.

### A. Risk & reward

#### A1. `dark_ritual` — sacrifice a unit for half its power
- **What**: sacrifice any non-core unit → crystal gains **half the unit's
  power** as permanent power (`Math.floor(unit.power / 2)`). Sacrificing a
  50-power bronze grants the crystal +25; an upgraded 120-power bronze grants
  +60 — a real payoff for giving up a board slot.
- **Engine hooks**: `discard_unit` (existing) does the removal; the new action
  `sacrifice_for_core_power` reads the target unit's `power` *before*
  discarding it and applies the bump as `applyPowerDelta(core,
  Math.floor(power / 2), permanent = true)` (or `core.bonusPower += …`).
  Routing: new phase branch in `SessionTransitions.select_encounter`.
- **Round gate**: round ≥ 3 (board needs a sacrificeable unit).
- **Effort**: small (L). Scoped in docs as P1.

#### A2. `soul_trade` — trade a loss for a gold
- **What**: lose 1 life (`losses += 1`) → immediately recruit any gold card.
- **Engine hooks**: new action `lose_life` (mirrors `rest_inn` below); then route
  to `shop` with a `gold_shop`-style generation (1 gold option). Combination of
  existing `gold_shop` shop branch + a loss mutation.
- **Guard**: reject if `losses >= LOSSES_TO_GAME_OVER - 1` (can't suicide).
- **Effort**: small (L). Scoped as P1.

#### A3. `gamblers_shrine` — risk on an owned unit's kit
- **What**: choose a unit → remove a random effect **or** reaction from it
  (seeded pick) → that unit gains flat permanent power.
- **Why this is the cheapest win in the catalog**: the mechanic already exists
  and is **tested** — `applyOrb(..., "sacrifice_effect_orb", ...)` in
  `core/src/Actions/OrbAndCoreUpgrades.ts` (`applySacrificeOrb`) removes a random
  effect/reaction and grants `SACRIFICE_POWER_INCREASE`. Its orb
  (`sacrifice_effect_orb`) is registered, presented
  (`content/orbPresentations.ts`), and covered by 5 unit tests — but **no
  encounter routes to it**. `gamblers_shrine` is a one-line addition to
  `ORB_SHOP_ENCOUNTER_OPTIONS` in `SessionTransitions.ts`:
  ```ts
  gamblers_shrine: [{ id: "sacrifice_effect_orb" }],
  ```
  plus an `EncounterId` entry, an `OptionGeneration.ENCOUNTERS` row
  (`filterType: null`), and catalog art/text.
- **Round gate**: round ≥ 2.
- **Effort**: trivial (XS). **Do this first.**

#### A4. `double_or_nothing` — harder fight now, free gold later
- **What**: accept → the next combat uses the round+1 enemy team; if you win,
  your next encounter is a free gold shop; on loss, nothing extra is lost beyond
  the loss itself.
- **Engine hooks**: `generateEnemyTeamForRound(round + 1, wins, seed)` passed via
  the `enemyTeam` override in `transitionToNextState` (the multiplayer seam
  already threads an injected enemy team — reuse it, rename the intent);
  on `end_combat` with `wonCombat`, set a `pending_gold_shop` flag that
  `createEncounterOptions` (or `select_encounter`) consumes.
- **Round gate**: round 4–8.
- **Effort**: medium (M) — needs one ephemeral session flag consumed at combat +
  at next encounter.

### B. Upgrade & manipulation

#### B1. `training_grounds` — free rank-up (integration note)
- **What (doc-proposed)**: free rank-up of a selected bronze.
- **Integration warning**: this overlaps heavily with the existing `upgrade_unit`
  wildcard (routes to `upgrade_orb`, which ranks up **any** unit). Adding a
  bronze-only free rank-up would be near-duplicate content.
- **Recommendation — two value-add variants**:
  - **Variant 1 (mass upgrade)**: rank up **two different** non-core units for
    free (reuses `upgradeUnitData` twice). Distinct from `upgrade_unit`, which is
    one orb.
  - **Variant 2 (upgrade + keep the slot)**: rank up one unit **and then** still
    receive a 2-option card shop (the encounter does not consume the slot like
    the orb wildcards do). This requires a new routing branch: `orb_shop`
    → `apply_upgrade` → **then** `shop` instead of `transitionToNextStep`.
- **Effort**: small (L) — both variants reuse `upgradeUnitData` +
  `generateShopOptions`.

#### B2. `scrap_salvage` — cannibalize a unit for its full power
- **What**: destroy a non-core unit → crystal gains **the unit's full power**
  as permanent power. The premium counterpart to `dark_ritual` (which grants
  half): scrapping a scaled-up bronze is the high-value play and rewards
  carrying a unit deep into the run.
- **Engine hooks**: `discard_unit` + a `sacrifice_for_core_power`-style bump —
  identical plumbing to A1 with a `1.0` ratio instead of `0.5`.
- **Balance note**: a rank-4 bronze can reach ~200 power, so full-power scrapping
  is deliberately strong — it consumes the unit and its board slot. The 0.5 vs
  1.0 ratio is the tuning dial; start at 1.0 and reduce if it outshines
  `upgrade_core_power` too often.
- **Round gate**: round ≥ 2 (early scrapping is for weak fillers).
- **Effort**: small (L). Scoped as P2.

#### B3. `enchanters_tower` — add a reaction to a reaction-less unit
- **What**: choose a unit with no reactions → it gains a reaction from a
  presented set (e.g. "on ally damage, gain 4 power" / "on ally shield, gain
  shield to self" / "on battle start, haste 1 ally").
- **Engine hooks**: `applyOrb` already adds reaction orbs via `buildReaction`
  (`ORB_DEFINITIONS` kind `"reaction"`). Present 3 reaction-orbs in an
  `orb_shop`; restrict the selectable unit set to those without reactions
  (client-side filter + server-side guard in the `apply_orb` handler).
- **Effort**: small (L). Scoped as P2.

#### B4. `reforge` — swap a unit's basic action type
- **What**: choose a unit → change its **basic action** (e.g. `damage` → `heal`,
  `shield` → `poison`), keeping power/cooldown/reactions. A "Form"-style
  transform (Bazaar).
- **Constraint**: swaps must target another **basic type**
  (`damage`/`heal`/`shield`/`poison`/`regen`) — the absolute basic-effect rule
  (docs/unit-balance.md §14) forbids a reforge that leaves a unit with no basic
  effect.
- **Engine hooks**: new helper `swapBasicAction(unit, newEffect)` in `core`
  — mutate `unit.effects[0]` (the basic action is conventionally effect index 0
  per the card-authoring checklist); new action `reforge_unit`.
- **Design caution**: swaps that lose the unit's own reaction trigger (e.g.
  shields → damage while its reaction keys off `shield` from allies) can brick a
  unit. Present only combo-valid swaps, or warn in the tooltip.
- **Effort**: medium (M) — new helper + validation. Scoped as P3.

#### B5. `duplicator` — equalize strongest→weakest
- **What**: choose your **strongest** and **weakest** non-core units → the
  weakest gains power until it matches the strongest's power (single-unit
  equalization, manual version of the `destiny_balancer` gold's identity).
- **Engine hooks**: reuse `applyPowerDelta(u, delta, permanent=true)` from
  `Entities/Unit`. New action `equalize_power` with two target unit ids.
- **Round gate**: round ≥ 3 (needs ≥ 2 units).
- **Effort**: small (L). **New concept** (not in prior docs).

### C. Health & survivability

> Life design note: `losses` is the only life counter (`LOSSES_TO_GAME_OVER = 4`).
> Restoration must be **scarce** — at most 1–2 restores per full run — or the
> loss system loses meaning. Gate these encounters aggressively
> (`maxRound` or low appearance weight) and make most cost something.

#### C1. `rest_inn` — restore 1 life
- **What**: `losses = max(0, losses - 1)`.
- **Engine hooks**: new action `restore_life` in `ACTION_HANDLERS`; no other
  changes. Note `STARTING_LIVES == LOSSES_TO_GAME_OVER == 4`, so `losses` is the
  inverse life counter — `losses - 1` is a legal restore.
- **Round gate**: round 2–6, appearing rarely.
- **Effort**: trivial (XS). Scoped as P2.

#### C2. `battle_rations` — next combat opens shielded
- **What**: the next combat starts with +N shield on the **player core** only.
- **Engine hooks**: new ephemeral session field
  `nextCombatModifier: { playerCoreShield?: number }`, consumed in
  `executeCombatPhase` right after `CombatSimulation.createCombatState` (apply to
  `combatState.playerCore.shield`), then cleared.
- **Effort**: small (L). Scoped as P2.

#### C3. `field_hospital` — restore a life, but face a weaker team
- **What**: restore 1 life **and** the next enemy team is generated at
  `round - 1` (weaker). Clean-trade survivor pick.
- **Engine hooks**: `restore_life` + the enemy-team injection seam from A4 with
  `round - 1` (guard at `Math.max(0, round - 1)`) + `nextCombatModifier`.
- **Effort**: small (L). **New concept** (variation of the doc's idea).

#### C4. `desperate_pact` — trade a loss for a richer silver shop
- **What**: lose 1 life → this slot becomes a 3-option silver shop (vs. the
  normal 2).
- **Engine hooks**: `lose_life` + `generateShopOptions` with a
  `silver_shop`-3-options variant (option-count parameter).
- **Guard**: reject near death threshold (same as A2).
- **Effort**: small (L). **New concept**.

### D. Strategy leveling (Celestial lineage)

#### D1. `tome_of_<type>` — permanent archetype boost (family)
- **What**: choose an archetype (`damage` / `heal` / `shield` / `poison` /
  `regen` / `haste`) → every **board** unit with that basic action gains +2
  permanent power **for the rest of the run**.
- **Engine hooks**:
  1. New session field `runBoons: Record<"damage"|"heal"|"shield"|"poison"|"regen"|"haste", number>`.
  2. New action `boost_archetype` storing the boon.
  3. New pure function `applyRunBoons(units, runBoons)` in `core`; called in
     `executeCombatPhase` on the player units after combat state creation (the
     same seam as C2), so it is deterministic for both local and server paths.
  4. Add a `filterType` mode or reuse `null` — these are **not** shops, they
     are single-decision encounters (route like the orb wildcards, but to the
     boon action).
- **Round gate**: round ≥ 4.
- **Effort**: medium (M) — new session field + action + combat hook. Scoped as P2.

#### D2. `blessing` — cross-type boon choice
- **What**: one slot, three fixed global boons to pick from, e.g.:
  - "all heal units +10 permanent power" (`increase_power` family),
  - "all poison units +10% critical",
  - "all shield units gain +1s haste on battle start" (needs a combat-start
    hook keyed by unit type).
- **Engine hooks**: same `runBoons` infrastructure as D1, extended with a
  `crit` and `startHaste` variant; the third variant needs a small
  `on_battle_start`-style injection at combat setup (apply a haste effect to
  shield-type units at tick 0).
- **Effort**: medium (M). **New concept**.

### E. Skip payoff (Tags lineage)

#### E1. `favor` — skips accumulate into a guaranteed silver ❌ (removed 2026-08-23)
> **Removed 2026-08-23** — the favor-token mechanic was rejected and rolled back
> together with the Lucky Pig encounter (A12). `skip` no longer banks tokens,
> `createEncounterOptions` no longer force-injects `silver_shop`,
> `SessionData.favorTokens` / `luckyPigRound` are gone, and the HUD favor counter
> (`ui.favor`) was removed. Original spec kept below for reference.
- **What**: every `skip` increments `favor_tokens` on the session. At 3 tokens,
  the next `createEncounterOptions` call guarantees a `silver_shop` option.
- **Engine hooks**:
  - `SessionData.favorTokens?: number`.
  - In the `skip` handler: `favorTokens += 1`.
  - In `createEncounterOptions`: if `favorTokens >= 3`, force-inject
    `silver_shop` into the 3 options (and consume tokens when the player picks
    it — or keep them until spent, design choice; simplest is consume on pick).
- **UI**: a favor counter in the HUD.
- **Effort**: small (L). Scoped as P2 (Balatro Tags).

#### E2. `sealed_vault` — bank a card for next round
- **What**: during this encounter, choose **one card from the full non-core
  pool** (presented as a preview shop) and **bank** it; it appears **free** in
  the first encounter slot of next round.
- **Engine hooks**: `SessionData.bankedCard?: string`; new preview-shop route;
  `createEncounterOptions` (or `select_encounter`) injects the banked card as a
  free 1-option shop when present.
- **Design caution**: this is a "deferred pick" with no downside — it needs a
  limit (once per run) or a small cost to stay interesting.
- **Effort**: medium (M) — preview-shop UI + session field. **New concept**.

### F. Archetype & reaction-targeted shops (closes §5.3/§5.4)

#### F1. `runesmith` — reaction-trigger silver shop (family)
- **What**: silvers filtered by **reaction trigger**, not by outcome effect.
  Answers the §5.4 gap ("silver identity is having a reaction") now that the
  silver pool is 21 cards.
- **Concrete instances** (one per popular trigger; 2 silver options each, 15g):
  | ID                 | Filter                              | Targets silver cards that…                        |
  |:-------------------|:------------------------------------|:--------------------------------------------------|
  | `runesmith_damage` | `reactions[].effectId === "damage"` | react to enemy/ally damage (cross-force counters) |
  | `runesmith_shield` | `reactions[].effectId === "shield"` | react to shields (durability engines)             |
  | `runesmith_heal`   | `reactions[].effectId === "heal"`   | react to healing (over-heal / heal engines)       |
  | `runesmith_haste`  | `reactions[].effectId === "haste"`  | haste synergy (haste engines)                     |
  | `runesmith_regen`  | `reactions[].effectId === "regen"`  | regen synergy                                     |
  | `runesmith_poison` | `reactions[].effectId === "poison"` | poison synergy                                    |
  | `runesmith_slow`   | `reactions[].effectId === "slow"`   | slow synergy                                      |
- **Engine hooks**: extend `EncounterFilterType` with a new branch
  `"reaction_<trigger>"`; in `filterCardsByEffect`, add a `filterByReactionTrigger`
  that checks `card.reactions.some(r => r.effectId === trigger)` and requires
  `rank === 2`. Option count 2 (silver pricing). Multi-source filtering: a card
  also qualifies if its `effects[].id` is the trigger (e.g. an `all`-trigger
  reaction card still fires on the trigger).
- **Effort**: small (L) in core; the generation function already generalizes.
  **Highest design value in the catalog** — makes the 21-silver pool navigable.

#### F2. `reaction_lab` — any-reaction unit shop
- **What**: any unit (silver **or gold**) that has at least one reaction; 1–2
  options. A shallower version of F1 that also surfaces gold reactions.
- **Engine hooks**: filter `card.reactions.length > 0` with no effect-type
  restriction; option count 1 (gold-tier pricing) for the gold branch.
- **Round gate**: round ≥ 5 (else it's just a silver shop).
- **Effort**: small (L). **New concept**.

### G. Choice-of-reward encounters (Standard lineage)

#### G1. `crossroads` — one card **or** one orb in one slot
- **What**: a single slot presents a **combined** choice: 2 cards + 1 orb; the
  player picks exactly one. The mini-hub without building the full Shop phase.
- **Engine hooks**: a new phase `choose_reward` generated from both
  `generateShopOptions` (2 options) and a small orb-options generator
  (1 orb from the registered stat specials, minus `upgrade` to preserve rank
  scarcity); pick routes to the existing `recruit_unit` or `apply_orb` handlers,
  then `transitionToNextStep`.
- **Effort**: medium (M) — new phase + mixed option type
  (`PhaseOption` currently carries either card-id or static id; needs a
  discriminated "orb option" variant).
- **Round gate**: round ≥ 2.

> Round gates in this catalog are the **earliest** availability only. The full
> turn-by-turn schedule — wave unlocks, win-checkpoint gates, event-queued tier
> shops, and the silver/gold gating redesign — is in §4.

---

## 4. Turn-by-turn scheduling

Round structure recap: 3 encounters per round (phases steps 0–2), combat at
step 4, upgrade/reaction at step 5. A full run needs 10 wins (≈ 10–14 rounds =
30–42 encounter slots); game over at 4 losses; infinite mode after round 10.
The existing generator samples **one equal-weight pool** with a 12-slot recency
exclusion. That is why `silver_shop`/`gold_shop` can appear at round 1 with the
same frequency as every other encounter — and can also vanish for an entire
run. This section replaces that with a **tiered, checkpoint-gated schedule**
and gives every new encounter a turn window.

### 4.1. Wave model

The run splits into three availability waves, gated by **win checkpoints** with
a round "firewall" as a fairness backstop:

| Wave                    | Unlock                  | Encounters that join the pool                                                                                                                                            |
|:------------------------|:------------------------|:-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Wave 1 — Foundation** | run start               | 10 bronze shops, `upgrade_unit`, `power_distributor`, `power_absorber`, `gamblers_shrine`, `scrap_salvage`, `rest_inn`, `battle_rations`, `crossroads`, `field_hospital` |
| **Wave 2 — Silver era** | **4 wins** (or round 6) | `silver_shop`, `runesmith_*`, `training_grounds`, `enchanters_tower`, `dark_ritual`, `duplicator`, `desperate_pact`, `soul_trade`, `double_or_nothing`, `sealed_vault`   |
| **Wave 3 — Gold era**   | **7 wins** (or round 9) | `gold_shop`, `reaction_lab`, `tome_of_*`, `blessing`, `reforge`                                                                                                          |

- Win checkpoints are the *design* gate (reward pace and success); the round
  firewall guarantees a slow-but-surviving player still sees silvers by round 6
  and golds by round 9.
- This is a strict pool split: Wave 2 items **cannot** be generated before
  Wave 2 unlocks — no round-1 gold shops. The wave gates *replace* the current
  display-only `minRound`/`maxRound` metadata (§4.3).

### 4.2. Master schedule (per round)

| Round | Slots | Typical wins | Expected mix (bronze shops always ~60–70% of slots)                                                                |
|:------|:------|:-------------|:-------------------------------------------------------------------------------------------------------------------|
| 1     | 3     | 0            | 2–3 bronze shops; 0–1 `upgrade_unit`                                                                               |
| 2     | 3     | 1            | 2 bronze; 0–1 special (`gamblers_shrine`, `scrap_salvage`, `rest_inn`, `battle_rations`, `crossroads`)             |
| 3     | 3     | 1–2          | same as round 2; `field_hospital` possible                                                                         |
| 4     | 3     | 2–3          | mostly bronze; 0–1 special                                                                                         |
| 5     | 3     | 3–4          | **silver era begins** (4 wins typically here): ~1 bronze + 1 silver/`runesmith_*`/`training_grounds` + 0–1 special |
| 6     | 3     | 4–5          | silver cadence assured (round-6 firewall)                                                                          |
| 7     | 3     | 5–6          | 1–2 bronze; 1 silver; `gold_shop` possible at 7 wins                                                               |
| 8     | 3     | 7            | **gold era begins** (7 wins typically here): + `gold_shop`, `reaction_lab`, `tome_of_*`                            |
| 9     | 3     | 8            | gold firewall (round 9); gold/boon weight up                                                                       |
| 10    | 3     | 9–10         | final push — gold availability guaranteed                                                                          |
| 11+   | 3     | 10+          | infinite: all waves; boon and risk encounters weighted up                                                          |

Mix rules: bronze shops remain the foundation (≈ 60–70% of slots across the
whole run); specials are weighted low; silver/gold tier events are
**pity-guaranteed** (§4.3) so they always appear at least a few times after
their unlock.

### 4.3. Silver & gold gating redesign

**Current problem.** `silver_shop` and `gold_shop` are plain rows in one
equal-weight pool; `minRound`/`maxRound` is display-only; with 15 rows and a
12-slot exclusion window, tier shops appear as early as round 1 at the same odds
as any bronze shop and can also miss an entire run.

**New model — three layers:**

1. **Checkpoint unlock (hard gate).** Tier shops are not pool members until
   their wave unlocks (§4.1): silver at **4 wins**, gold at **7 wins**. Before
   the unlock, `silver_shop`/`gold_shop`/`runesmith_*`/etc. cannot be generated.

2. **Event-queued rewards (non-random).** High-tier shops also arrive as
   *forced options* triggered by player state — the player experiences them as
   earned, not rolled:

   | Trigger                                                                                            | Reward                                                                                                                                             |
   |:---------------------------------------------------------------------------------------------------|:---------------------------------------------------------------------------------------------------------------------------------------------------|
   | 2 different bronze→silver rank-ups (via `upgrade_unit`, `training_grounds`, or duplicate recruits) | one-time `gold_shop` offer next encounter — "the merchant notices your progress" (`merchant_interest` counter; the "upgrading a bronze unit" idea) |
   | 5 total recruits                                                                                   | one-time `silver_shop` offer (recruit counter; the "x units" idea)                                                                                 |
   | ~~3 skips (`favor`, E1) — removed 2026-08-23~~                                                    | ~~`silver_shop` guaranteed in the next options~~                                                                                                   |
   | `soul_trade` accepted (A2)                                                                         | immediate gold shop (the slot itself)                                                                                                              |
   | `double_or_nothing` won (A4)                                                                       | next encounter = `gold_shop`                                                                                                                       |
   | `sealed_vault` banked card (E2)                                                                    | free card in the next round's first slot                                                                                                           |

3. **Pity backstop (anti-frustration).** After 4 wins, if 6 encounter slots
   pass with no silver-tier option, force `silver_shop` into the next options;
   from 7 wins, if 9 slots pass without a gold-tier option, force `gold_shop`.
   This guarantees cadence regardless of shuffle.

**Constants change.** `MIN_ROUND_FOR_SILVER_SHOP` 1 → 3 and
`MIN_ROUND_FOR_GOLD_SHOP` 6 → 7 (earliest *rounds*; the wave checkpoints are the
enforced gate, round values are pure fallbacks).

### 4.4. Per-encounter schedule

| Encounter                                         | Earliest round | Unlock gate               | Cadence per run     | Preferred window                       |
|:--------------------------------------------------|:---------------|:--------------------------|:--------------------|:---------------------------------------|
| 10 × bronze shop (`armory` … `assassins_hideout`) | 1              | —                         | ~18–25 of ~30 slots | everywhere                             |
| `upgrade_unit`                                    | 1              | —                         | 1 per wave          | rounds 1, 5, 8                         |
| `gamblers_shrine` (A3)                            | 2              | round ≥ 2                 | 1–2                 | early-to-mid (before kits are sacred)  |
| `scrap_salvage` (B2)                              | 2              | round ≥ 2                 | 1                   | early                                  |
| `rest_inn` (C1)                                   | 2              | rounds 2–6                | 0–1                 | after a loss — scarce                  |
| `battle_rations` (C2)                             | 2              | round ≥ 2                 | 1–2                 | before a likely hard fight             |
| `crossroads` (G1)                                 | 2              | round ≥ 2                 | 1 per wave          | mid-round of each wave                 |
| `power_distributor` / `power_absorber`            | 3              | round ≥ 3                 | 1 each per wave     | waves 2–3                              |
| `dark_ritual` (A1)                                | 3              | wave 2                    | 1                   | mid-game (units to spare)              |
| `training_grounds` (B1)                           | 3              | wave 2                    | 1–2                 | mid-game — feeds the merchant gate     |
| `enchanters_tower` (B3)                           | 3              | wave 2                    | 1                   | after first silver                     |
| `duplicator` (B5)                                 | 3              | wave 2                    | 1                   | mid-game                               |
| `desperate_pact` (C4)                             | 3              | wave 2                    | 0–1                 | when at 1–2 losses                     |
| `field_hospital` (C3)                             | 3              | round ≥ 3                 | 0–1                 | when at 1–2 losses                     |
| `sealed_vault` (E2)                               | 3              | wave 2, once per run      | 0–1                 | mid-game                               |
| `soul_trade` (A2)                                 | 4              | wave 2                    | 0–1                 | when ≥ 2 losses remain (life to spare) |
| `double_or_nothing` (A4)                          | 4              | wave 2, rounds 4–8        | 0–1                 | mid-game                               |
| `reforge` (B4)                                    | 4              | wave 3                    | 0–1                 | late-game pivots                       |
| `silver_shop`                                     | 3              | **wins ≥ 4** or round ≥ 6 | 2–3                 | waves 2–3                              |
| `runesmith_*` (F1)                                | 3              | **wins ≥ 4** or round ≥ 6 | 1–2                 | waves 2–3                              |
| `tome_of_*` (D1)                                  | 4              | **wins ≥ 7**              | 0–2                 | waves 3+                               |
| `blessing` (D2)                                   | 5              | **wins ≥ 7**              | 0–1                 | waves 3+                               |
| `reaction_lab` (F2)                               | 5              | **wins ≥ 7**              | 1                   | waves 3+                               |
| `gold_shop`                                       | 7              | **wins ≥ 7** or round ≥ 9 | 2                   | waves 3                                |

Note — `favor` (E1, removed 2026-08-23) was not a pool entry: it was a *system*
modifier (skip tracker) feeding the event queue ("guaranteed silver after 3
skips").

---

## 5. New engine primitives required (summary)

| Primitive                                                                       | Kind                        | Used by             | Effort |
|:--------------------------------------------------------------------------------|:----------------------------|:--------------------|:-------|
| `restore_life` / `lose_life` actions                                            | action handler              | C1, C3, A2, C4      | XS     |
| ~~`favorTokens` session field + skip hook~~ (removed 2026-08-23)                 | session field               | E1                  | L      |
| `runBoons` session field + `applyRunBoons()` combat hook                        | session field + combat hook | D1, D2              | M      |
| `nextCombatModifier` ephemeral field (core shield / enemy round offset / prize) | session field + combat hook | C2, C3, A4          | L      |
| `bankedCard` session field + free-option injection                              | session field + generation  | E2                  | M      |
| `sacrifice_for_core_power` action                                               | action handler              | A1, B2              | XS     |
| `boost_archetype` / `equalize_power` / `reforge_unit` actions                   | action handlers             | D1, D2, B5, B4      | L–M    |
| reaction-trigger filter in `filterCardsByEffect`                                | generation                  | F1, F2              | L      |
| `choose_reward` phase (mixed card+orb option)                                   | phase + option type         | G1                  | M      |
| reuse the enemy-team injection seam                                             | generation seam             | A4, C3              | L      |
| wave-split encounter pools + enforced win checkpoints (4/7) + round firewalls   | generation                  | all tier shops      | M      |
| event queue (forced options: merchant gate, recruit gate, favor, prizes)        | generation + session fields | tier shops          | M      |
| pity counters (silver after 6 empty slots, gold after 9)                        | generation                  | silver/gold cadence | L      |
| wire orphaned `sacrifice_effect_orb` via `ORB_SHOP_ENCOUNTER_OPTIONS`           | routing                     | A3                  | XS     |

Additional constant-phase work (every encounter needs it): `EncounterId` union in
`core/src/types/action.ts`, an `ENCOUNTERS` row in `OptionGeneration.ts`, catalog
entry in `core/src/content/encounters.ts`, i18n keys, and art (or reuse existing
`ui/*` assets).

---

## 6. Sequencing

### P1 (first sprint — all small/trivial, verified seams)

0. **Checkpoint-gated, wave-split pools (prerequisite — §4.3).** Split the
   encounter pool into waves, enforce the 4-win/7-win gates + round firewalls,
   and add the event queue + pity counters. Everything below depends on this;
   it fixes the round-1 silver/gold bug and supersedes the old §5.1 round-gate
   fix.
1. **A3 `gamblers_shrine`** — wire the orphaned `sacrifice_effect_orb` (XS).
2. **C1 `rest_inn`** — `restore_life` action (XS).
3. **A1 `dark_ritual`** / **B2 `scrap_salvage`** — sacrifice-for-core-power (L).
4. **A2 `soul_trade`** — `lose_life` + gold-shop route (L).
5. **F1 `runesmith_*`** (start with 2–3 triggers: `damage`, `shield`, `heal`) —
   reaction-trigger filter (L). This is the highest **design** value: it
   activates the 21-silver pool.

### P2 (next)

6. **B1 `training_grounds`** (mass-upgrade variant to avoid duplicating
   `upgrade_unit`).
7. **B3 `enchanters_tower`** — reaction-add via reaction orbs.
8. **C2 `battle_rations`**, **C3 `field_hospital`** — `nextCombatModifier`.
9. ~~**E1 `favor`** — skip economy.~~ (built 2026-08-19, removed 2026-08-23)
10. **D1 `tome_of_*`** — `runBoons` + combat hook.
11. **B5 `duplicator`**, **G1 `crossroads`**.

### P3 (design-verify before building)

12. **B4 `reforge`**, **C4 `desperate_pact`**, **D2 `blessing`**,
    **E2 `sealed_vault`**, **F2 `reaction_lab`**, **A4 `double_or_nothing`**.

---

## 7. Guard rails (what NOT to add)

Re-affirmed from encounter-system.md §9.3/§10.3, kept in force by this catalog:

- **No gold economy.** Every new encounter that "pays" gives a card/orb/boon —
  never a currency. `soul_trade`/`desperate_pact` price in **losses**, the
  existing run resource.
- **Tier shops are checkpoint-gated, never equal-weight random draws.** Wave-2
  (silver) and Wave-3 (gold) encounters cannot appear before their unlock; win
  checkpoints (4/7) are the primary gate, round firewalls the fairness
  fallback, and the event queue + pity counters guarantee cadence (§4.3).
- **No optional combat.** `double_or_nothing` is the only combat-touching
  encounter and it modifies the *stakes* of the mandatory fight, it does not
  create or skip one.
- **No minigames / NPCs.** All new encounters reuse the existing
  select→resolve→advance flow.
- **Life restoration is scarce.** C1/C3 are the only life-gain sources; cap total
  restores per run in playtest (design target: 1–2 per full run).
- **Every new core mutation stays pure + deterministic.** New actions must
  operate on the `structuredClone`d session in `SessionTransitions` (existing
  convention) and every RNG pick must use the seeded `math/Random`.
- **Wave locks are a prerequisite for every gated encounter.** Any encounter
  with an availability gate (A1–A4, B1–B5, C1, C4, D1–D2, F1–F2, silver/gold
  shops) depends on the wave-split pools + checkpoint enforcement (§4.3) — do
  not add gated encounters before that engine work lands.
