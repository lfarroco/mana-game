# Card System — Risks & Improvement Roadmap

> Generated 2026-08-10 from a systematic review of the card design philosophy,
> unit balance model, and trigger system. Companion to
> [card-design-philosophy.md](card-design-philosophy.md) and
> [unit-balance.md](unit-balance.md).

This document identifies the highest-risk gaps in the card design system and
proposes concrete, sequenced improvements. Each section is a self-contained
initiative with a clear deliverable.

---

## 1. Silver pool expansion (P0 — highest priority)

**Problem**: 8 silver cards across a 92-card pool. The silver shop offers 2
options, so the same cards repeat every run. Silver is supposed to be the
"situational synergy" tier that enables archetype pivots, but with this pool size
there is no variety and no real choice.

**Target**: ≥ 20 silver cards.

**Design brief for new silvers**:

| Archetype | Trigger | Response | Example concept |
| :--- | :--- | :--- | :--- |
| Poison engine | `poison` from `column_allies` | `increasePower` to trigger | "Plague Doctor" — scales with the column's poison output |
| Shield engine | `shield` from `row_allies` | `shield` to `weakest_ally` | "Echo Sentinel" — doubles down on shield stacking |
| Haste engine | `haste` from `allies` | `haste` to `self` | "Wind Dancer" — self-accelerates when teammates haste |
| Damage enabler | `damage` from `left_ally` | `increaseCritical` to `trigger` | "Spotter" — boosts the unit to its left when it attacks |
| Heal engine | `heal` from `column_allies` | `regen` to `all_allies` | "Vitality Font" — converts localized healing into team regen |
| Slow synergy | `slow` from `row_allies` | `poison` to `randomEnemy` | "Miasma Weaver" — punishes slowed enemies with poison |
| Cross-force | `shield` from `enemies` (triggerTeam: enemy) | `increasePower` to `self` | "Breach Hunter" — grows when the enemy shields up |

**Design rules for new silvers**:
- Every silver must have exactly one reaction (the tier's identity rule).
- Raw power ≤ 75, AP band [120, 260].
- Each silver should enable exactly one archetype. Avoid "generic good" silvers
  that fit every board — that is bronze's job.
- Prefer narrow triggers (directional ally, column) over broad ones (all allies)
  to keep board placement meaningful.

**Implementation plan**:
1. Design and add 12 new silver cards to `core/src/data/BaseCollection.ts`.
2. Run `cd core && npm test` — verify all pass the structural and AP band checks.
3. If any new silver overflows the [120, 260] AP band, either tune its numbers
   or add it to `AP_ALLOWLIST` with a justification.
4. Add art assets (pics) for each new silver.
5. Playtest: verify each new silver appears in silver shops and creates
   meaningful pivot decisions.

**Success metric**: After a full run, a player should see at least 4–5 distinct
silver cards across all silver shops, with no single card repeating more than
once per run.


---

## 2. Gold feasibility audit (P1)

**Problem**: The AP model cannot verify whether a gold card's engine condition
is achievable. A gold that is perfectly in-band mathematically may be impossible
to enable in practice. There is no automated check for this — it requires manual
audit.

**Audit checklist** (per [card-design-philosophy.md](card-design-philosophy.md) §3.1):
1. Enabler count: ≥ 3 non-core, unlocked cards produce the required effect.
2. Enabler tier distribution: not all enablers are gold.
3. Worst-case AP: the brick value (zero engine triggers) is ≥ 60 AP.
4. Best-case ceiling: ≤ 500 AP with all 8 allies producing the trigger.
5. Shop visibility: a typed encounter (armory, healing_tent, etc.) provides
   the enabler effect.

**Audit the 5 currently unlocked golds**:

| Card | Engine trigger | Audit status |
| :--- | :--- | :--- |
| `toxicologist` | `poison`, `all_allies` | Needs audit |
| `expedition_leader` | `every_100_shield`, `all_allies` | Needs audit |
| `vanguard` | `on_battle_start` haste | Needs audit |
| `veteran_paladin` | `heal`, `all_allies_of_type` | Needs audit |
| `webert_the_old` | `damage`, `all_allies` | Needs audit |

**Deliverable**: An audit table with each gold, each checklist item, a
pass/fail, and a recommended fix for failures. Also audit all locked golds —
a gold that is impossible to play is a dead unlock reward.

---

## 3. Disruption & counterplay design (P1)

**Problem**: No purge, silence, dispel, or counter-synergy mechanics exist.
Compositions have no predators. For PvE this is acceptable short-term, but
as multiplayer is added ([game-server.md](game-server.md)) the meta will converge
to a few dominant synergy packages. Even in PvE, the lack of counterplay reduces
strategic depth — the player never needs to "tech" against a specific enemy board.

**Design brief** (from [card-design-philosophy.md](card-design-philosophy.md) §3.2):

| Effect | Mechanic | Tier | Notes |
| :--- | :--- | :--- | :--- |
| `purge` | Clears all shield/poison/regen stacks from target crystal | Silver | Counters shield-stacking and DoT-heavy boards |
| `silence` | Prevents target unit from triggering reactions for N seconds | Silver | Direct counter to silver/gold synergy engines |
| `taunt` | Forces enemy effects to target this unit's crystal | Silver | Protective tool for fragile compositions |
| `reflect` | Returns X% of received damage as a one-time hit | Silver | Punishes glass-cannon damage boards |
| `mana_burn` | Reduces target crystal's max life by N for this combat | Silver | Anti-tank tool against high-life compositions |

**Implementation priority**: Start with `purge` and `silence` — they address the
two most degenerate board states (infinite shield/regen stacking and infinite
reaction cascades). The remaining three can follow in subsequent releases.

**Implementation plan**:
1. Add `purge` and `silence` as effect types in the TriggerSystem
   (`core/src/TriggerSystem/`).
2. Add them to the AP model in `BaseCollection.balance.test.ts` (pricing:
   purge ≈ 30 base cost for the full clear; silence ≈ 4 × duration_seconds ×
   number_of_targets).
3. Define the effect logic in `CombatRunner.ts`: `purge` zeroes out the crystal's
   shield/poison/regen; `silence` adds a `silenced` flag that `processReactions`
   checks before firing.
4. Create 2–3 silver cards each for `purge` and `silence`, following the silver
   design rules from §1 above.
5. Add a `purge_encounter` and `silence_encounter` shop type so players can
   target these effects when they see a counterable enemy board.



---

## 4. Positional design depth (P2)

**Problem**: The 3×3 grid is treated primarily as a reaction cost multiplier.
Card designs don't exploit the grid as a strategic space.

**Ideas** (from [card-design-philosophy.md](card-design-philosophy.md) §3.3):
- **Front-row / back-row roles**: row 0 (front) units get higher base life;
  row 2 (back) units get longer cooldowns but stronger effects.
- **Adjacency bonuses**: effects that scale with adjacent ally count (4 for
  center, 2 for edges, 1 for corners).
- **Positional threats**: enemy targeting like "strongest in row" or "weakest
  in column" forces defensive arrangement.
- **Column/row archetypes**: a full column of shield units or a full row of
  damage units as a composition mini-game.

**Implementation note**: Positional mechanics are mostly **new effect types and
reaction positions**, not core engine changes. The TriggerSystem already supports
row/column/directional positions. The main work is card design and playtesting.

**Priority**: Lower than §1 (silver pool) and §3 (disruption). Address after
the card pool exceeds 100+ cards and silver variety is healthy.

---

## 5. AP model refinements (ongoing)

These are smaller adjustments to the balance model itself.

### 5.1. Haste/slow targeting restriction

**Problem**: The haste/slow ΔAP formula assumes a generic target, but a haste
caster that consistently targets the board's highest-power unit far exceeds the
model's estimate.

**Proposal**: Restrict haste effects to `randomAlly` targeting only (never a
specific directional ally or self). Same for slow → `randomEnemy`.

**Impact**: May require re-tuning existing haste/slow cards. Assess first.

### 5.2. Permanent power cost reduction

**Problem**: The 5× multiplier makes permanent-power units trap picks in short
runs or when recruited late ([unit-balance.md](unit-balance.md) §16).

**Proposal**: Reduce the multiplier from 5× to 3× (6×amount vs 4×amount for
temporary). Break-even at ~2 combats instead of ~4.

**Impact**: Existing permanent-power cards become cheaper in the AP model and
may need stat adjustments. Run the balance test after the change.

### 5.3. AP band tightening

**Problem**: Bands overlap: Bronze [80, 160], Silver [120, 260], Gold [150, 320].
A silver with an inactive reaction can be weaker than a bronze.

**Proposal**: After playtest data is collected:

| Tier | Current band | Proposed band | Rationale |
| :--- | :--- | :--- | :--- |
| Bronze | [80, 160] | [85, 135] | Baseline should be tight |
| Silver | [120, 260] | [140, 240] | Narrower, still room for synergy variance |
| Gold | [150, 320] | [170, 300] | Tighter floor (no sub-bronze bricks) |

**Risk**: Significant re-tuning. Do not attempt until the card pool is stable
with 2–3 months of playtest data.

### 5.4. On-hit trigger caps

**Problem**: `every_100_damage` etc. have flat base frequency 1.0, but actual
trigger rate scales with board power — self-accelerating.

**Proposal**: Add a per-combat activation cap (e.g. max 10 activations).

**Impact**: Assess existing `every_X` cards. If any exceed 10 activations in
playtest, the cap changes their practical AP.



---

## 6. Testing gaps

The automated balance test is strong but has blind spots. Consider adding:

### 6.1. Enabler-count test (new)

A test that, for each gold card, counts the number of non-core, unlocked
bronze/silver cards that produce the required trigger effect. Flag any gold
with < 3 total enablers or with all enablers at gold tier. This automates
the gold feasibility checklist items 1 and 2.

### 6.2. Silver redundancy check (new)

A test that measures how many distinct silvers appear in the average silver
shop sequence (e.g. across 5 silver shops). With 8 silvers, expected distinct
count is ~6; with 20 silvers, ~9–10. Design-time check, not CI.

### 6.3. Best-case AP ceiling test (new)

A test that computes each card's AP with maximum triggers (all 8 allies firing
the trigger effect at maximum frequency) and flags any card exceeding 500 AP.
Catches degenerate compositions before they ship.

---

## 7. Summary & sequencing

| Priority | Initiative | Estimated effort | Blocks |
| :--- | :--- | :--- | :--- |
| **P0** | Silver pool expansion (12 new cards) | 2–3 weeks design + art | — |
| **P1** | Gold feasibility audit of existing golds | 1–2 days | — |
| **P1** | Encounter system fixes — round-gating, remove dead code, effect-filtered silvers | 1–2 weeks | Silver pool > 12 cards for effect-filtered silvers |
| **P1** | Risk/reward encounters — `dark_ritual`, `soul_trade` | 2–3 days | — |
| **P1** | Upgrade/manipulation — `training_grounds` (free rank-up) | 2–3 days | — |
| **P1** | Disruption effects — `purge` & `silence` | 3–4 weeks (engine + cards + art) | Silver pool > 12 cards |
| **P2** | Health/resource encounters — `rest_inn`, `battle_rations` | 3–4 days | — |
| **P2** | Skip rewards — favor tokens for guaranteed silver shop | 2–3 days | — |
| **P2** | Upgrade/manipulation — `enchanters_tower`, `scrap_salvage` | 1 week | — |
| **P2** | Strategy-leveling encounters — `tome_of_*` | 1–2 weeks | Silver pool > 12 cards |
| **P2** | Positional depth mechanics | 2–4 weeks | Large card pool |
| **P3** | Upgrade/manipulation — `reforge` (swap action type) | 1 week | `training_grounds` + `enchanters_tower` first |
| **P3** | Health/resource — `field_hospital`, `desperate_pact` | 4–5 days | `rest_inn` first |
| **P3** | Hub Shop phase | 3–4 weeks | All of the above |
| **Ongoing** | AP model refinements (haste, perm-power, bands, on-hit caps) | Varies | Playtest data |
| **Ongoing** | New balance tests (enabler count, best-case ceiling) | 1–2 days each | — |

See [encounter-system.md](encounter-system.md) for the full encounter analysis with Balatro (§9) and The Bazaar (§10) design comparisons.
Mana Battle has **no gold economy** — see [encounter-system.md](encounter-system.md) §8.

**Recommended first sprint**:
1. Add the enabler-count and best-case-ceiling tests (§6.1, §6.3).
2. Run the gold feasibility audit on all existing golds (§2).
3. Fix silver/gold shop round-gating in `createEncounterOptions()` ([encounter-system.md](encounter-system.md) §5.1).
4. Design 6 new silver cards to bring the pool to 14.
5. Implement `dark_ritual` and `soul_trade` encounter handlers ([encounter-system.md](encounter-system.md) §10.4).

