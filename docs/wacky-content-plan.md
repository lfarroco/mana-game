# Fun & Wacky Content Plan

> Generated 2026-08-19. This is the **reviewed, implementation-ready** plan for
> making Mana Battle "fun and wacky" through four content paths: new units, new
> effect types, new encounters, and edits to existing content.
>
> Companion docs (read before implementing): [card-design-philosophy.md](card-design-philosophy.md),
> [unit-balance.md](unit-balance.md), [trigger-system.md](trigger-system.md),
> [encounter-system.md](encounter-system.md), [new-encounter-types.md](new-encounter-types.md),
> [card-system-risks-and-roadmap.md](card-system-risks-and-roadmap.md).
>
> This doc supersedes the earlier exploratory "Balatro Jokers → Mana Battle"
> analysis. It carries the reviewed scope (pro-model pass), the binding design
> decisions, and a discrete, claimable task list. The AGENTS.md Task Queue points
> here; tasks are picked one at a time, marked `[x]`, then removed.

## 0. Goal & thesis

Mana Battle's comedy comes from three emergent sources:

1. **Board-state humor** — positional (row/column/adjacent) synergies gone sideways.
2. **Reaction chains** — your own combo exploding or backfiring.
3. **Gambles** — seeded variance you *chose* to take.

The tasks below deliberately target these three, not raw stat inflation. Everything
stays **pure and deterministic** (seeded RNG only) and **replay-safe** (combat is
server-simulated for multiplayer; see [game-server.md](game-server.md)).

---

## 1. Verified engine facts (reference sheet — do not re-derive)

| Fact | Where |
|---|---|
| Effect ids (actions): `damage` `heal` `shield` `poison` `regen` `haste` `slow` `charge` `increase_power` `decrease_power` `multiply_power` `increase_critical` `distribute_power` `absorb_power` `sacrifice_effect` `re_hasted` `re_slow` | `core/src/types/effect.ts` |
| Global reaction ids: `on_crit` `on_battle_start` `on_over_heal` `every_100_damage` `every_10_poison` `every_100_heal` `every_10_regen` `every_100_shield` | `core/src/types/effect.ts` + `core/src/Models.ts` `GLOBAL_REACTIONS` |
| `BASIC_ABILITIES = [damage, shield, poison, regen, heal]`; a reaction with `effectId: "all"` fires **only** on basic abilities | `core/src/Models.ts` + `TriggerSystem.processReactions` |
| `processReactions` skips `charge`/`increase_power`/`decrease_power`/`multiply_power` as *trigger sources* | `core/src/TriggerSystem/TriggerSystem.ts` (~212) |
| `position: "self"` is legal **only** for global reactions (others can never fire) | `validateCardDefinition` in `core/src/Entities/Card.ts` |
| Targeting: `self`, `random_ally(count)`, `random_enemy(count)`, `row_allies`, `column_allies`, `all_allies(ofType)`, `all_enemies`, `strongest_/weakest_ ally/enemy`, `top_/bottom_/left_/right_ally`, `trigger`. `all_allies` excludes self; `ofType` is one of `any\|damage\|heal\|shield\|poison\|regen` | `core/src/types/targeting.ts` + `resolveTargets` |
| `multiply_power` is **gold-only + cooldown ≥ 8000ms** (test-enforced) | `BaseCollection.balance.test.ts` |
| `charge` capped at **300ms/cast**; charge *reactions* must key off a specific effect + directional ally (test-enforced) | `BaseCollection.balance.test.ts` |
| Slot cap **≤ 3** (`effects.length + reactions.length`); ≥ 1 basic action per non-core card (test-enforced) | `BaseCollection.balance.test.ts` |
| AP bands: bronze `[80,160]`, silver `[120,260]`, gold `[150,320]`; raw-power caps `50/75/90`; `AP_ALLOWLIST` for intentional risk cards | `BaseCollection.balance.test.ts` |
| Pool: **61 bronze / 21 silver / 10 gold**. Test enforces `silvers > golds` and `golds ≤ 10` (see task A0) | `card-design-philosophy.md` + `BaseCollection.balance.test.ts` |
| `on_battle_start` fires **per-unit**, bypassing position filtering — `position: "self"` works there | `CombatRunner.runCombat` (~83) |
| Enemy teams are **real pool cards** via `Card.makeUnit`, so they carry reactions | `core/src/Combat/generateEnemyTeam.ts` |
| Session-time repositioning already exists: `update_team` action → `SessionManagement.updateTeamAction` (validates 3×3, no dupes, same count) | `core/src/session/SessionManagement.ts` + `phaser/src/Components/Chara/input.ts` |
| Card fields: `id, pic, power?, cooldown, effects, reactions, isCore?, locked?, rank?, life?, critical?, description?, tags?` | `core/src/types/card.ts` |

**Encounter wiring (4 touch-points per new encounter):**
1. `EncounterId` union — `core/src/types/action.ts` (~line 14).
2. `ENCOUNTERS` row (`{ id, filterType }`) — `core/src/session/OptionGeneration.ts` (~line 38).
3. Catalog entry (`EncounterData`: `id, pic, nameKey, descriptionKey, minRound?, maxRound?`) — `core/src/content/encounters.ts`.
4. Routing in `select_encounter` — `core/src/session/SessionTransitions.ts` (~line 133): inline special-cases (`rest_inn`, `soul_trade`), `ORB_SHOP_ENCOUNTER_OPTIONS` → `orb_shop`, otherwise `shop` via `generateShopOptions`.

Plus i18n keys + art. The P1 slice (`rest_inn`, `soul_trade`, `dark_ritual`,
`scrap_salvage`, `gamblers_shrine`, `runesmith_*`) is already in the codebase
(2026-08-18) and is the template to copy.

**A new effect id costs more than the implementation** — every new effect must also
touch: `types/effect.ts` (union), `TriggerSystem.processEffectIO` (switch), a
`TriggerSystem/effects/*.ts` module, `descriptions.ts`, `abilityColors.ts`, i18n keys,
a `CombatLogger` log entry (for playback), and unit tests. Budget **M (≈2–3 days)**
per effect, not "small".

---

## 2. Binding design decisions

- **D1 — the gold cap is a *ratio*, not an absolute.** The current `golds ≤ 10` test
  is an artifact of a 92-card pool. What matters is the gold *share* of the total pool.
  Task **A0** replaces the absolute cap with a proportional guard (target ≈ 12%,
  keeping `silvers > golds`). New golds are fine **if** the overall pool grows or an
  existing gold is demoted — never add golds in isolation.
- **D2 — scope is the ranked shortlist in §4** (the pro-model pass cut the original
  ~30-item kitchen sink). Tier A ships first with zero engine work.
- **D3 — enemy-team generation is out of scope.** Do **not** change
  `generateEnemyTeam` / `EnemyGeneration` for now (the "mirror match" and "themed
  enemy teams" ideas are deprioritized).
- **D4 — discrete tasks.** Each task is a separate, independently-claimable item with
  its own files and acceptance criteria. A task may be claimed by one agent at a time.

---

## 3. Task index

| ID | Task | Type | Tier | Effort |
|---|---|---|---|---|
| A0 | Gold cap → percentage guard | test edit | A | XS |
| A1 | Pixie Trickster (bronze) | unit | A | XS |
| A2 | Vulture (silver) | unit | A | XS |
| A3 | The Leech (silver) | unit | A | XS |
| A4 | Echo of the Mask (bronze) | unit | A | XS |
| A5 | Lifestealer (bronze) | unit | A | XS |
| A6 | `gambler` edit → true coin-flip | edit | A | XS |
| A7 | `mirror_entity` edit → real mirror | edit | A | XS |
| A8 | `fate_shifter` edit → Twisted Mirror | edit | A | XS |
| A9 | Oracle's Riddle (random bronze) | encounter | A | S |
| A10 | Chaos Altar (random orb) | encounter | A | S |
| A11 | Roulette Wheel (life gamble) | encounter | A | S |
| A12 | Lucky Pig (favor ×3) | encounter | A | S |
| A13 | `upgrade_core` Mystery Box | edit | A | XS |
| A14 | `add_reaction_core` random option | edit | A | XS |
| A15 | Effect shops allow silvers (round ≥ 4) | edit | A | S |
| B1 | `when` predicates on reactions | effect | B | M |
| C1 | `repeat`/retrigger | effect | C | M |
| C2 | `on_crystal_hit` global reaction (thorns) | effect | C | M |
| D1 | `silence` | effect | D | M |
| D2 | `dispel` | effect | D | M |

## 4. Tasks

### Tier A — pure data (no engine work; balance-test guarded)

> **A0 first if you intend to add any gold.** Tier A unit/encounter tasks do not
> add net-new golds, so they can proceed independently of A0.

#### A0 — Gold cap → percentage guard

- **Goal**: make the gold-pool limit proportional to total pool size (Decision D1).
- **Files**: `core/src/data/BaseCollection.balance.test.ts` (the
  `silvers > golds` + `golds ≤ 10` assertions, ~line 244).
- **Spec**: replace `expect(golds.length).toBeLessThanOrEqual(10)` with a share
  guard, e.g. `expect(golds.length / nonCoreCards.length).toBeLessThanOrEqual(0.12)`
  (target ≈ 12%, mirroring Balatro's ~13% rare share). Keep `silvers > golds`.
- **Acceptance**: `cd core && npx jest src/data/BaseCollection.balance.test.ts --runInBand`
  green; doc note explaining the chosen ratio.

#### A1 — Pixie Trickster (new bronze)

- **Goal**: chaos tempo — every cast hastes a random ally AND slows a random enemy.
- **Files**: `core/src/data/cards/bronzeCards.ts`.
- **Spec**: `rank: 1`, `power ≈ 35`, `cooldown ≈ 5000`,
  `effects: [haste(1000, randomAlly(1)), slow(1000, randomEnemy(1))]`, `reactions: []`,
  `tags: ["haster","disabler"]`, `pic` reuse an existing `neutral_*` asset, i18n + description.
- **Acceptance**: AP within `[80,160]`; balance test green.

#### A2 — Vulture (new silver)

- **Goal**: feeds on weakness — grows power when enemies are slowed.
- **Files**: `core/src/data/cards/silverCards.ts`.
- **Spec**: `rank: 2`, `power ≤ 75`, `cooldown ≈ 6000`,
  `effects: [poison]`,
  `reactions: [reaction("slow", "enemies", increasePower(6, self), "enemy")]`,
  `tags: ["cross_force","grow_over_time"]`.
- **Acceptance**: AP within `[120,260]`; exactly one reaction (silver identity rule).

#### A3 — The Leech (new silver)

- **Goal**: parasitic reversal — when the **enemy** heals, *your* crystal gains shield.
- **Files**: `core/src/data/cards/silverCards.ts`.
- **Spec**: `rank: 2`, `power ≤ 75`, `cooldown ≈ 5800`,
  `effects: [shield]`,
  `reactions: [reaction("heal", "enemies", shield, "enemy")]`,
  `tags: ["cross_force","type_engine"]`.
- **Acceptance**: AP within `[120,260]`; add a small combat test that enemy heal
  triggers your shield (mirror existing cross-force tests).

#### A4 — Echo of the Mask (new bronze)

- **Goal**: copy-paste with lag — when the left ally casts any basic ability, buff a random ally.
- **Files**: `core/src/data/cards/bronzeCards.ts`.
- **Spec**: `rank: 1`, `power ≈ 30`, `cooldown ≈ 4000`,
  `effects: [shield]`,
  `reactions: [reaction("all", "left_ally", increasePower(3, randomAlly(1)))]`,
  `tags: ["team_buff"]`.
- **Acceptance**: AP within `[80,160]`; note `"all"` only fires on basic abilities.

#### A5 — Lifestealer (new bronze)

- **Goal**: the first damage+heal hybrid — sustains your crystal while attacking.
- **Files**: `core/src/data/cards/bronzeCards.ts`.
- **Spec**: `rank: 1`, `power ≈ 40`, `cooldown ≈ 5400`,
  `effects: [damage, heal]`, `reactions: []`, `tags: ["team_buff"]`.
- **Acceptance**: AP within `[80,160]`; confirmed no existing card combines `damage`+`heal`.

#### A6 — `gambler` edit → true coin-flip

- **Goal**: the flagship risk card should *feel* like a gamble — crit goes to a random target.
- **Files**: `core/src/data/cards/bronzeCards.ts` (`gambler`, ~line 587).
- **Spec**: change `increaseCritical(10, column)` → `increaseCritical(10, randomAlly(1))`
  (optionally a seeded coin-flip ally/enemy for max chaos). Randomize the row reaction
  target too if desired.
- **Acceptance**: AP still within band, or add to `AP_ALLOWLIST` with justification.

#### A7 — `mirror_entity` edit → real mirror

- **Goal**: proper mirror fantasy — when bottom ally casts, **haste** the top ally (tempo echo).
- **Files**: `core/src/data/cards/bronzeCards.ts` (`mirror_entity`, ~line 557).
- **Spec**: replace `reaction("all","bottom_ally", increasePower(10, top))` with
  `reaction("all","bottom_ally", haste(1000, top))` (tune numbers).
- **Acceptance**: AP in band; enables haste chains with existing haste engines.

#### A8 — `fate_shifter` edit → Twisted Mirror

- **Goal**: the wild double-edged gamble — multiply the strongest ally **and** the
  strongest enemy (can backfire). (Note: this *is* the "Twisted Mirror" concept; it
  already exists as `fate_shifter` — do **not** add a new card.)
- **Files**: `core/src/data/cards/goldCards.ts` (`fate_shifter`, ~line 168).
- **Spec**: change `multiplyPower(1.5, right)` + `multiplyPower(1.5, weakestEnemy)` →
  `multiplyPower(1.5, strongestAlly)` + `multiplyPower(1.5, strongestEnemy)`.
- **Acceptance**: `multiply_power` stays gold-only + cooldown ≥ 8000 (it already is);
  add to `AP_ALLOWLIST` with a "double-edged, helps the enemy" justification.

#### A9 — Oracle's Riddle (new encounter) ✅ (2026-08-19)

- **Goal**: you get what you get — instantly recruit a **random bronze** (no choice).
- **Files**: `types/action.ts` (EncounterId), `OptionGeneration.ts` (ENCOUNTERS row,
  `filterType: null`), `content/encounters.ts` (catalog entry), `SessionTransitions.ts`
  (`select_encounter` inline branch, mirroring `rest_inn`).
- **Spec**: on select, pick a random rank-1 non-core card via seeded RNG and recruit it
  into a free slot (`RecruitmentActions.recruitUnit`), then `transitionToNextStep`.
  Round gate `minRound: 2`. (Face-down reveal is optional UI polish — the core is the
  no-choice random recruit.)
- **Acceptance**: unit test in `core/src/session/` verifying a bronze is recruited and
  the slot is filled; deterministic under the session seed.

#### A10 — Chaos Altar (new encounter) ✅ (2026-08-19)

- **Goal**: you pick the victim, the orb is a surprise — a random orb hits a chosen unit.
- **Files**: same 4 touch-points as A9.
- **Spec**: select → route to `orb_shop` with a special "random orb" marker; on apply,
  pick a random orb from the registered stat/special orbs via seeded RNG and call
  `OrbAndCoreUpgrades.applyOrb`. Round gate `minRound: 2`.
- **Acceptance**: unit test that the applied orb is one of the registered orbs and is
  seed-deterministic.

#### A11 — Roulette Wheel (new encounter) ✅ (2026-08-19)

- **Goal**: pay 1 life to spin a seeded wheel — gold card / free orb / favor / nothing /
  lose another life.
- **Files**: same 4 touch-points as A9.
- **Spec**: inline `select_encounter` branch: guard `losses + 1 >= LOSSES_TO_GAME_OVER`
  (reject near death, mirroring `soul_trade`); `losses += 1`; seeded weighted roll;
  apply the winning outcome (recruit gold / apply orb / nothing / `losses += 1`).
- **Acceptance**: unit tests for each wheel outcome + the near-death guard.
- **Implemented weights**: gold card 20% / free orb 20% / core stat upgrade 20% /
  nothing 25% / lose another life 15%. The "favor" outcome is a random core stat
  upgrade until favor tokens exist (A12); the lose-a-life outcome re-checks the
  near-death guard so a single spin can never itself reach game over.

#### A12 — Lucky Pig (new encounter)

- **Goal**: skips this round pay triple (favor ×3).
- **Files**: same 4 touch-points as A9.
- **Spec**: set a session flag (`luckyPigRound`); in the `skip` handler
  (`SessionTransitions.skip`), if the flag is set, `favorTokens += 3` instead of `+1`.
  **Depends on the favor-token infrastructure** (E1 in new-encounter-types.md). If favor
  tokens are not yet implemented, build them first or drop this task.
- **Acceptance**: unit test for the ×3 skip.

#### A13 — `upgrade_core` Mystery Box

- **Goal**: a wacky 4th option — random core upgrade.
- **Files**: `core/src/session/SessionTransitions.ts` (`UPGRADE_CORE_OPTIONS`, ~line 27)
  + a new `StaticOptionId` in `types/action.ts` + a handler.
- **Spec**: add `{ id: "random_core_upgrade" }` to `UPGRADE_CORE_OPTIONS`; handler picks
  one of `increase_core_max_life` / `upgrade_core_power` / `decrease_core_cooldown` via
  seeded RNG and applies it.
- **Acceptance**: unit test; option appears in the `upgrade_core` phase.

#### A14 — `add_reaction_core` random option

- **Goal**: a wacky 4th option — random core reaction.
- **Files**: `SessionTransitions.ts` (`ADD_REACTION_CORE_OPTIONS`, ~line 33) + a new
  `StaticOptionId` + handler.
- **Spec**: add a `{ id: "random_reaction_core" }` option; handler picks one of
  `on_100_damage_effect` / `on_crit_effect` / `on_battle_start_effect` via seeded RNG.
- **Acceptance**: unit test; option appears in the `add_reaction_core` phase.

#### A15 — Effect-filtered shops allow silvers at round ≥ 4 ✅ (2026-08-19)

- **Goal**: more variety in the most common shop; surfaces silver synergy cards.
- **Files**: `core/src/session/OptionGeneration.ts` (`filterCardsByEffect`, ~line 189;
  note the hard `getCardRank(card) === 1` filter at ~line 215).
- **Spec**: thread `session.round` into the filter; for rounds ≥ 4, allow rank ≤ 2
  (bronze + silver) for effect-type filters (keep `silver`/`gold`/`reaction_*` branches
  unchanged). Keep 3 options.
- **Acceptance**: unit test that round 2 returns bronze-only and round 4 can return silvers.

### Tier B — engine extension (cheapest wacky condition)

#### B1 — `when` predicates on reactions ✅ (2026-08-19)

- **Goal**: the literal "Joker condition" mechanic — reactions that fire only when a
  board-state predicate holds. Unlocks Half Joker ("≤ N allies"), Flower Pot ("all 5
  basic types present"), Blackboard ("mono-type board").
- **Files**: `core/src/types/effect.ts` (add optional `when?` to `EffectReaction`),
  `core/src/TriggerSystem/TriggerSystem.ts` (`processReactions` predicate check),
  `descriptions.ts` (predicate text), tests.
- **Spec**: `when` is a pure predicate over the reactor's team, e.g.
  `{ minAllies?, maxAllies?, ofTypes?: EffectId[] }` (all types present). Evaluate at
  trigger time; skip the reaction when false. Keep it deterministic (board state only).
- **Follow-up cards** (separate tasks once B1 lands): Half Joker (bronze, ramps when the
  board has ≤ 3 allies), Flower Pot (gold, multiplies when all 5 types are on the board).
- **Acceptance**: unit tests for each predicate; existing reactions (no `when`) unaffected.

### Tier C — engines package (combo explosions — the real payoff)

#### C1 — `repeat`/retrigger ✅ (2026-08-19)

- **Goal**: double-cast — the flagship "cast engine" archetype.
- **Files**: `types/effect.ts` (optional `repeat?: number` on effects),
  `TriggerSystem.processEffectIO` (loop the effect `repeat` times),
  `descriptions.ts`, `abilityColors.ts`, `CombatLogger` (per-cast log),
  `BaseCollection.balance.test.ts` (cap rule), tests.
- **Spec**: `repeat` re-fires the effect `repeat` times per cast. **Balance guard
  (mirror charge discipline)**: a card with `repeat > 1` is gold-only or cooldown ≥ 8000ms;
  cap `repeat` at 2–3. Add a test rule like the `multiply_power` one.
- **Follow-up card**: Grand Conductor (gold, `on_battle_start` grants one cycle of
  double-cast to allies — needs a `repeat` variant that scales off haste, or just
  self-`repeat` for simplicity).
- **Acceptance**: unit tests; new balance rule enforced; deterministic playback.

#### C2 — `on_crystal_hit` global reaction (thorns) ✅ (2026-08-19)

- **Goal**: revenge — react when *your crystal actually takes damage* (not when the
  enemy merely casts).
- **Files**: `types/effect.ts` (EffectId), `Models.ts` (`GLOBAL_REACTIONS`),
  `TriggerSystem/effects/dealDamage.ts` (hook in the deferred hit execution),
  `descriptions.ts`, tests.
- **Spec**: in the deferred `damage_hit` execution, call
  `processReactions(env, sourceUnit, { id: "on_crystal_hit" }, 1)`. **Loop guard**:
  skip the emit when the damage originated from a reaction chain (or cap per combat),
  so thorns-vs-thorns cannot ping-pong. Mirror the `every_100_X` threshold-level guard.
- **Follow-up card**: Thornback (silver, `reaction("on_crystal_hit","allies", damage)` —
  your power is dealt back to the enemy crystal).
- **Acceptance**: unit test that a hit (not a cast) triggers it, and that thorns-vs-thorns
  terminates.

### Tier D — counterplay package (re-ranked down: "hate tech", not "chaos")

#### D1 — `silence` ✅ (2026-08-19)

- **Goal**: disable an enemy unit's effects/reactions for a duration. Fills the
  documented P1 gap (card-system-risks §3). PvE-viable (enemy teams carry reactions).
- **Files**: `types/effect.ts`, `Models.ts` (`silenced` counter on `Unit`),
  `CombatRunner.chargeUnits` / `processEffectsIO` (skip while silenced), a
  `TriggerSystem/effects/silence.ts` module, `descriptions.ts`, `CombatLogger`, tests.
- **Spec**: tick `silenced` down like `hasted`; a silenced unit skips its action cast.
  Gold-only (counterplay to whole boards) or narrow targets.
- **Follow-up card**: Hexblade (gold, damage + silence the strongest enemy).
- **Acceptance**: unit test that a silenced unit casts nothing for the duration.

#### D2 — `dispel` ✅ (2026-08-19)

- **Goal**: strip status effects (poison/regen/haste/slow/charge/shield) from a target.
- **Files**: `types/effect.ts`, a `TriggerSystem/effects/dispel.ts` module calling into
  the existing status systems, `descriptions.ts`, tests.
- **Spec**: clear the target's status counters. Ally- or enemy-targetable.
- **Acceptance**: unit test that dispel removes each status type.

### Tier E — stretch (not scheduled; do only if appetite returns)

`exchange_power` (+The Swapper gold), `swap_position` combat-time (+Trickster gold,
Shuffle Storm boon), cast-count timing jokers (Loyalty Card/Photograph/Acrobat),
`recoil`/`decrease_charge`, Reality Rift, Necromancer's Bargain, Rival's Mockery.

### Out of scope (Decision D3)

Enemy-team generation changes ("mirror match", themed all-one-type teams) — do **not**
modify `generateEnemyTeam` / `EnemyGeneration` for now.

---

## 5. Cross-cutting requirements (every task must satisfy)

- **New effect id**: also touch `types/effect.ts`, `TriggerSystem.processEffectIO`,
  a `TriggerSystem/effects/*.ts` module, `descriptions.ts`, `abilityColors.ts`, i18n
  keys, a `CombatLogger` log entry (playback), and unit tests. Any RNG must use seeded
  `math/Random` and thread `env.seed` (see `dealDamage` crit pattern).
- **New card**: `rank`/`power`/`cooldown` per tier caps; AP within band or
  `AP_ALLOWLIST` with a written justification; slot cap ≤ 3; ≥ 1 basic action; i18n +
  `pic` + `description` + `tags` (from `CARD_TAGS`).
- **New encounter**: 4 touch-points from §1 + i18n + art; pure + deterministic
  (mutate a `structuredClone`d session in `SessionTransitions`, seeded RNG).
- **Verify**: `cd core && npm test` and `npm run typecheck` after every change.

## 6. Sequencing

1. **Tier A** (no engine work) — A1–A8 + A9–A15 in any order; A0 whenever a gold is
   added. This is the shippable first slice (~1–2 sprints).
2. **B1** (`when` predicates) — cheapest engine win, in parallel with Tier A.
3. **C1** (`repeat`) then **C2** (`on_crystal_hit`) — the combo/revenge package.
4. **D1/D2** — only after C, or fold into the multiplayer phase.

## 7. Verification commands

```bash
cd core
npm test                                   # full suite
npm run typecheck                          # types
npx jest src/data/BaseCollection.balance.test.ts --runInBand   # card balance gate
```

---

## 8. Additional lessons & follow-on ideas (not yet scheduled)

Further Joker-list lessons beyond the tasks above. Noted for future work; the
two most immediately actionable are marked **★**.

### 8.1 The downside axis ("stickers")

Balatro's Eternal/Perishable/Rental stickers are a *second* orthogonal axis to
rarity — you pay a downside for more power. Mana Battle has only the upside axis
(rank + orbs). The cheapest fun version:

- **★ Perishable units** — an encounter/orb that grants a unit extra permanent
  power but flags it `perishable`; the unit is discarded after N rounds. Session
  field + round decrement (mirrors `rest_inn`/`losses` mutations). Creates forced
  re-recruitment churn and "use it while you can" decisions.

### 8.2 Rotation ("changes each round")

`To Do List` / `Ancient Joker` / `The Idol` / `Mail-In Rebate` rotate their target
each round to force adaptation. Mana Battle equivalent: a **rotation boon** — "this
round +power to `damage` units, next round `heal` units, …" — implemented as a
round-indexed run boon. Pairs with the `applyRunBoons` seam from
new-encounter-types D1.

### 8.3 Count-based power (Bull, Bootstraps, Joker Stencil, Abstract)

"Power scales with the *shape* of the board": +power per empty slot, per ally, per
tier. Needs B1's count predicates plus a "count" source; medium. A direct wacky
build-around: a gold that grows per **empty** board slot (rewarding a thin board —
the Stencil analog).

### 8.4 Negation / constraint conditions

`Ride the Bus` / `Green Joker` / `Obelisk` / `Campfire` reward *avoiding* something,
not just triggering. Extend B1's `when` predicate with a `not` variant (e.g. "no
ally has cast `heal` this combat") to unlock constraint-based play.

### 8.5 Run-history scaling (Supernova, Fortune Teller, Throwback, Constellation)

Jokers that scale with *what you did this run* (hands played, tarots used, blinds
skipped). Mana Battle equivalent: units that gain permanent power per combat won /
orb used / encounter skipped this run. Needs session stats threaded into combat
setup (the same `applyRunBoons` seam). Cheapest: a Supernova analog ("+1 permanent
power per combat won this run").

### 8.6 Probability as a dial (Oops! All 6s, Bloodstone, Lucky Cat)

Manipulate the RNG itself. **★ The "Oops! All 6s" card is already pure data**: a
gold `on_battle_start` → `increaseCritical(N, allAllies)` mass-crit engine (tune to
band or `AP_ALLOWLIST`). A global "double crit chance" run boon is a small session
flag.

### 8.7 Acquisition as content (Legendary via The Soul; 45 conditional unlocks)

*How* you get a card is itself content. Two takeaways:

- Give new locked golds **thematic unlock conditions** (achievement wiring) that
  teach a strategy (Balatro's "win a run in 18 rounds" pattern).
- A rare **once-per-run "Soul" encounter** granting a legendary-tier unit — a
  memorable chase moment outside the normal shop cadence.

### 8.8 (minor) Timing-position vocabulary (played/held/deck)

Balatro's precise played-vs-held-vs-deck distinctions suggest a
"has-cast-this-combat" state as a future trigger condition. Low priority; only
worth it if cast counters (Tier E) land first.





