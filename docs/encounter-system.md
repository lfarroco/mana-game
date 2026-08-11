# Encounter System

> Generated 2026-08-10. Companion to [card-design-philosophy.md](card-design-philosophy.md)
> and [card-system-risks-and-roadmap.md](card-system-risks-and-roadmap.md).

The encounter system is the **strategic decision layer** between combats — it
governs which cards, upgrades, and orbs the player can acquire, and how those
options are filtered, priced, and sequenced. This document describes the full
system and identifies gaps.

---

## 1. Phase structure

Each round consists of 6 phases (defined in `core/src/PhaseSystem/PhaseConfig.ts`):

| Step | Default | Rounds 2, 6, 10 | Infinite (round > 10) |
| :--- | :--- | :--- | :--- |
| 0 | `encounter` | `encounter` | `encounter` |
| 1 | `encounter` | `encounter` | `encounter` |
| 2 | `encounter` | `encounter` | `encounter` |
| 3 | `pre_combat` | `pre_combat` | `pre_combat` |
| 4 | `combat` | `combat` | `combat` |
| 5 | `upgrade_core` | `add_reaction_core` | _(none)_ |

- **3 encounters per round**, every round. The player picks (or skips) one
  encounter per step.
- `pre_combat` presents a single "start combat" button — no choice, just a
  confirmation gate before the fight.
- `upgrade_core` offers 3 static options (increase max life, upgrade power,
  decrease cooldown).
- `add_reaction_core` offers 3 static options (on-100-damage effect, on-crit
  effect, on-battle-start effect).
- Victory condition: 10 wins. Game over: 4 losses. After 10 wins the player
  enters infinite mode with no more upgrade phases.

---

## 2. Encounter types (15 total)

Defined in `core/src/session/OptionGeneration.ts` ENCOUNTERS array.

### 2.1. Effect-filtered encounters (10)

Each offers **3 bronze cards** matching a specific effect type. The filter
checks both actions and reactions. Cost: 10g per card.

| Encounter ID | Effect filter | Theme |
| :--- | :--- | :--- |
| `armory` | `damage` | Armory |
| `healing_tent` | `heal` | Healing Tent |
| `frontier_fort` | `shield` | Frontier Fort |
| `forest_pools` | `regen` | Forest Pools |
| `toxic_chamber` | `poison` | Toxic Chamber |
| `trial_circuit` | `haste` | Trial Circuit |
| `trappers_guild` | `slow` | Trapper's Guild |
| `thunder_spire` | `charge` | Thunder Spire |
| `commanders_tent` | `increase_power` | Commander's Tent |
| `assassins_hideout` | `increase_critical` | Assassin's Hideout |

**Key constraint**: Only returns **rank 1 (bronze)** cards. `filterCardsByEffect`
in OptionGeneration.ts hard-filters to `rank === 1`. Silvers and golds with
matching effects never appear. Effect-filtered encounters are purely for building
a bronze foundation.

### 2.2. Tier-filtered encounters (2)

| Encounter ID | Filter | Options | Cost | Intended round gate |
| :--- | :--- | :--- | :--- | :--- |
| `silver_shop` | Silver cards (rank 2) | 2 | 15g | Rounds 1–5 |
| `gold_shop` | Gold cards (rank 3) | 1 | 25g | Rounds 6+ |

> **Warning**: Round gating is not enforced in generation logic (§5.1).

### 2.3. Wildcard encounters (3)

Offer **3 cards of any tier** at their respective tier prices. These also trigger
an `orb_shop` phase before any card shop.

| Encounter ID | Orb offered | Orb effect |
| :--- | :--- | :--- |
| `upgrade_unit` | `upgrade_orb` | Upgrades a unit to the next rank |
| `power_distributor` | `distribute_power_orb` | Unit distributes power to allies |
| `power_absorber` | `absorb_power_orb` | Unit absorbs power from allies |

**Flow**: select encounter → `orb_shop` phase → apply orb → step advances to
next encounter. The orb is the reward; no card shop follows.



---

## 3. Encounter generation

`createEncounterOptions()` in `OptionGeneration.ts`:

1. Takes the session's encounter history (or initializes empty).
2. Excludes the **last 12** encounters from the pool (shuffled by session seed).
3. Picks the **first 3** from the remaining pool.
4. Appends the 3 selected to the history.

**Properties**:
- With 15 encounters and 12-slot exclusion, after 4 encounter picks (12 shown),
  the pool resets — only 3 unseen encounters remain.
- A full run (10+ rounds × 3 encounters = 30+ picks) cycles through the pool
  ~2 times.
- Deterministic (seeded by session seed) — same seed = same sequence.

---

## 4. Shop flow after encounter selection

When a player selects an encounter, `SessionTransitions.select_encounter`
routes the session:

```
select_encounter
├── id === "start_combat" → executeCombatPhase()
├── id in ORB_SHOP_ENCOUNTER_OPTIONS → "orb_shop" phase
│   └── after orb applied → transitionToNextStep() → next encounter
└── otherwise → "shop" phase
    └── generateShopOptions() → 1–3 card options
        └── after recruit → transitionToNextStep() → next encounter
```

**Skip**: Available in encounter, shop, orb_shop, upgrade_core, and
add_reaction_core phases. Calls `transitionToNextStep()`.

---

## 5. Issues & gaps

### 5.1. Silver/gold round-gating not enforced (P1)

The `minRound`/`maxRound` metadata in `Encounter.ts` is visual-only. The
generation logic in `OptionGeneration.ts` does not filter by round. Gating
works incidentally through history cycling but is not guaranteed.

**Fix**: Add round-based filtering to `createEncounterOptions()`.

### 5.2. "Improve type" encounters are dead code (P2)

`Encounter.ts` defines 5 entries (`improve_damage`, `improve_heal`,
`improve_shield`, `improve_poison`, `improve_regen`) with no corresponding
entries in `OptionGeneration.ENCOUNTERS`. They can never appear. They appear
to be a scrapped "improve existing unit" feature.

**Fix**: Remove the dead entries or repurpose them.

### 5.3. Effect-filtered encounters only show bronze (P1)

`filterCardsByEffect()` hard-filters to `rank === 1`. A player building toward
a synergy involving a silver card has no targeted way to find it. The only
non-bronze access is through silver/gold shops (2+1 options, thin pool) or
wildcard draws (3 random cards from 92).

**Proposal**: After silver pool expansion (≥ 20 silvers), allow effect-filtered
encounters to include silver cards alongside bronze, or add "expert" variants
at round 4+.

### 5.4. No encounters for synergy/reaction archetypes (P2)

All encounters filter by effect presence. There is no way to target:
- "Units with a reaction" (silver identity)
- "Units that react to shields" (counter to shield boards)
- "Units that grant haste to allies" (haste engine enablers)

**Proposal**: When the silver pool reaches ≥ 20, add synergy-filtered encounters
at rounds 3+.

### 5.5. Wildcard encounters give orb but not card shop (P3)

Selecting `upgrade_unit`/`power_distributor`/`power_absorber` routes through
orb_shop then advances to the next encounter. The player never sees a card shop
for that slot. The descriptions imply a unit recruitment that doesn't happen.

### 5.6. Pre-combat is a no-choice gate (P3)

Step 3 in every round is `pre_combat` — a single "start combat" button with no
decision. This is a confirmation screen, not a meaningful phase.

**Consider**: Merge into the last encounter step. After the third encounter
resolves, transition directly to combat.

### 5.7. Silver shop i18n is stale (P3)

The English locale says `"only one option"` but the code gives 2 options.

### 5.8. Encounter history window is fixed at 12 (P3)

With 15 encounters and 12-slot exclusion, cards repeat every ~5 encounter picks.
As the pool grows, consider scaling the history window.

---

## 6. Summary table

| Encounter | Pool | Options | Cost | Orb | Round gate | Issue |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `armory` | Bronze damage | 3 | 10g | — | — | OK |
| `healing_tent` | Bronze heal | 3 | 10g | — | — | OK |
| `frontier_fort` | Bronze shield | 3 | 10g | — | — | OK |
| `forest_pools` | Bronze regen | 3 | 10g | — | — | OK |
| `toxic_chamber` | Bronze poison | 3 | 10g | — | — | OK |
| `trial_circuit` | Bronze haste | 3 | 10g | — | — | OK |
| `trappers_guild` | Bronze slow | 3 | 10g | — | — | OK |
| `thunder_spire` | Bronze charge | 3 | 10g | — | — | OK |
| `commanders_tent` | Bronze inc_power | 3 | 10g | — | — | OK |
| `assassins_hideout` | Bronze inc_crit | 3 | 10g | — | — | OK |
| `silver_shop` | Silver (rank 2) | 2 | 15g | — | Broken | §5.1 |
| `gold_shop` | Gold (rank 3) | 1 | 25g | — | Broken | §5.1 |
| `upgrade_unit` | Any tier | 3 | varies | upgrade | — | §5.5 |
| `power_distributor` | Any tier | 3 | varies | distribute | — | §5.5 |
| `power_absorber` | Any tier | 3 | varies | absorb | — | §5.5 |
| `improve_*` (×5) | — | — | — | — | — | Dead | §5.2 |

---

## 7. Recommended first steps

1. **Fix silver/gold round-gating** (§5.1) — add round-based filtering to
   `createEncounterOptions()`.
2. **Remove dead `improve_*` entries** (§5.2) — clean up Encounter.ts.
3. **Fix silver shop i18n** (§5.7) — change "only one option" to "two options".
4. **Consider effect-filtered silvers** (§5.3) — after silver pool expansion,
   let effect-filtered encounters include silver cards at round 4+.


---

## 8. Why there is no gold

Mana Battle intentionally has **no in-run currency**. The `getCardCost` values
(10/15/25) in `OptionGeneration.ts` are display-only tier indicators — no gold
is tracked, deducted, or accumulated in the session state. The encounter slot
is the entire economy.

### Design rationale

1. **Gold adds complexity without adding decisions.** A gold system introduces
   income balancing, price tuning, hoarding strategies, interest mechanics,
   and "can't afford it" frustration — all to solve a problem that doesn't exist.
   The core choice in Mana Battle is "which of these 1–3 cards do I place on my
   3×3 grid?" Budgeting gold would be a parallel track that doesn't intersect
   meaningfully with board-building.

2. **The encounter slot is already a budget.** Each round has exactly 3 encounter
   picks. A gold card costs 1 pick; a bronze card costs 1 pick. The tier
   difference manifests as **fewer options** (1 gold vs 3 bronze), **rarer
   appearance** (gold shop unlocks at round 6), and **higher opportunity cost**
   (using the pick on this instead of something else). A gold shop that charged
   actual gold would risk showing a gold the player can't afford — pure
   frustration with no strategic upside.

3. **Skipping bad encounters IS saving.** When a player skips three bad bronze
   options, they preserve their board slot for a better card later. A full 9-slot
   board means every recruit displaces something. Skipping bad options is a form
   of "saving board quality," which is more interesting than saving a number.

4. **Contrast with Balatro.** Balatro *needs* gold because its shop has 6+ slots
   of different reward categories and the player needs a way to choose among them.
   Mana Battle's encounters give one card. A gold economy would be
   drafting-with-extra-steps — the extra step adds depth on paper but not fun
   in practice.

### Implications

- **Drop the `cost` display from shop cards.** Showing "15g" on a silver card
  implies an economy that doesn't exist. Replace with a tier badge (Bronze /
  Silver / Gold icon).
- **If gold is ever added**, it should serve a specific purpose beyond card
  acquisition — e.g. rerolling encounter options, buying extra encounter slots,
  or purchasing "strategy leveling" upgrades (see §9.2). A pure card-purchasing
  gold system is not worth the complexity.



---

## 9. Design inspiration: Balatro's pack system

Balatro's encounter/booster system is a useful reference because it maps reward
categories to encounter types, making every choice instantly legible.

### 9.1. What Balatro does

| Balatro pack | Reward category | What it means |
| :--- | :--- | :--- |
| **Arcana** | Tarot cards | Modify individual cards (change suits, add enhancements, destroy, copy) |
| **Celestial** | Planet cards | Level up poker hands — invest in your existing strategy |
| **Standard** | Playing cards | Add new cards to your deck — the foundational resource |
| **Spectral** | Spectral cards | High-risk/high-reward: destroy for power, duplicate at a cost |
| **Buffoon** | Jokers | Scoring engines — change how your deck scores |
| **Shop** | Everything | Hub phase where you can buy from all categories |
| **Tags** | Skip bonus | Skipping a fight gives a bonus next Shop |

The key insight: each pack gives a **completely different kind of reward**, not
just a different filter on the same reward type. A Celestial pack isn't a
"planet-filtered Joker pack" — it's a fundamentally different category.

### 9.2. What Mana Battle is missing

Mapping Balatro's reward categories to potential Mana Battle equivalents:

| Balatro | Mana Battle current | Potential new encounter |
| :--- | :--- | :--- |
| **Arcana** (modify foundation) | Orbs (upgrade, distribute, absorb) | "Enchantment" — apply effects to existing units, swap types, add reactions |
| **Celestial** (level up strategy) | Core upgrades (power/life/cooldown) | "Tome" — +power to all units of a type for the rest of the run |
| **Standard** (add foundation) | 10 effect-filtered encounters — solid | Works; needs bronze-only constraint lifted at higher rounds |
| **Spectral** (risk/reward) | **None** | "Ritual" — sacrifice unit for crystal power, lose life for gold card |
| **Buffoon** (scoring engine) | Silver/gold shops + wildcards | Works; improves with silver pool expansion |
| **Tags** (skip for later) | Skip wastes a slot | Skip grants favor tokens — 3 tokens = free silver recruit |
| **Shop** (hub) | **None** | Once-per-round hub: 2 units + 1 orb + reroll |

### 9.3. What NOT to copy

- **Balatro's shop complexity** (6+ slots, vouchers, interest, sell prices).
  Mana Battle's "3 encounters → combat → upgrade" rhythm is clean. Don't
  replace it with a dense shop screen.
- **Planet cards as a separate category.** Mana Battle's equivalents are rank
  upgrades and core upgrades — these already exist as distinct phases.
- **No combat in Balatro.** The encounter-to-combat rhythm is Mana Battle's
  strength — encounters should remain pre-combat preparation.

### 9.4. Prioritized additions

**P1 — Risk/reward encounters** (minimal engine changes, high impact):
- `dark_ritual`: sacrifice a unit → permanent +5 power on crystal
- `soul_trade`: lose 1 life → recruit any gold unit from the pool
- Uses existing action types, just needs new handlers in SessionTransitions.
  Adds a missing design dimension (trade-offs) and makes board management
  more meaningful.

**P2 — Skip rewards** (small engine change):
- Every skip increments `favor_tokens` on the session.
- 3 tokens = guaranteed silver shop next encounter.
- Makes "passing on bad options" accumulate toward a payoff.

**P3 — Strategy-leveling encounters** (new effect type):
- `tome_of_poison`: +2 permanent power to all poison units on board.
- Requires a new effect that filters by effect type — straightforward but
  needs a new effect ID and combat runner hook.

**P3 — Hub Shop** (major UI + engine work):
- Once-per-round: 2 random units, 1 random orb, reroll button.
- Only pursue if encounter pacing feels too limited after the above.



---

## 10. Design inspiration: The Bazaar's encounter categories

The Bazaar uses ~60+ encounters across distinct reward categories. Its system
validates several patterns Mana Battle is missing and confirms that encounter
diversity — not just filter diversity — drives strategic variety.

### 10.1. What The Bazaar does

| Category | ~Count | Example encounters | What they do |
| :--- | :--- | :--- | :--- |
| **Shops** | 10+ | Armory, Botanical Gardens, Furnace, Guard Locker | Acquire items filtered by type |
| **Upgrades & enchanting** | 7+ | The Artist (enchant), Forja (forge), Form (transform), B1 & B2 (upgrade bronze) | Modify items you already own |
| **Gold & economy** | 10+ | Cache of Riches, Invest in Yourself, Economic Seminar | Acquire or spend currency for long-term payoff |
| **Health & survivability** | 6+ | Hospital, Relax, Regenerative Tincture, Tranquil Spring | Restore health or gain survivability items |
| **Risk & reward** | 8+ | Borrow, Investment Pitch, Strange Mushroom, Mysterious Portal, Thieves Guild | Trade immediate cost for future payoff, gamble |
| **Combat events** | 8+ | Battlefield, Deadly Duel, Epic Battle, Bounty Hunters | Optional fights with scaled rewards |
| **Minigames** | 5+ | Cabin Fishing, Racetrack, Obstacle Course, Eating Contest | Flavor activities with random rewards |
| **Exploration** | 12+ | Artisan Dunes, Jungle Ruins, Frozen Tomb | Themed locations offering item/reward choices |
| **Named NPCs** | 10+ | Aldric, Botul, Dabora, Shrouded Figure | Character interactions with unique rewards |

### 10.2. What Mana Battle is missing (Bazaar-validated)

Three categories stand out as high-value, low-implementation-cost additions:

**1. Upgrade & manipulation encounters** — modify units you already own.

The Bazaar validates that "improve what you have" is a distinct and necessary
reward category separate from "add something new." Mana Battle has only two
modification tools (rank upgrade orb, distribute/absorb orbs). Potential
additions:

| Encounter | Effect | Implementation cost |
| :--- | :--- | :--- |
| `training_grounds` | Upgrade a selected bronze unit to rank 2 for free | Reuses `recruitUnit` upgrade path; no new effect |
| `enchanters_tower` | Add a simple reaction (e.g. `increasePower` on `damage` from `row_allies`) to any unit that doesn't have one | New static reaction template applied via orb-like flow |
| `reforge` | Change a unit's basic action type (damage→heal, shield→poison, etc.) | New action handler + effect ID swap |
| `scrap_salvage` | Destroy a unit, gain a permanent +3 power on your crystal | Reuses `discardUnit` + simple stat bump |

**2. Health & survivability** — life as a spendable/recoverable resource.

Mana Battle currently tracks lives (4 losses = game over) but offers no way to
interact with them beyond win/loss. The Bazaar treats health as a resource you
can spend, restore, and invest in — giving life management strategic weight.

| Encounter | Effect | Implementation cost |
| :--- | :--- | :--- |
| `rest_inn` | Restore 1 life | New action type: `restore_life` — simple session mutation |
| `battle_rations` | Start next combat with +100 shield on crystal | New temporary status on `CombatState` init |
| `field_hospital` | Restore 1 life, but spawn a weaker enemy team next combat | New `restore_life` + enemy power scalar |
| `desperate_pact` | Lose 1 life → recruit any gold unit | Combines `restore_life` (negative) + `recruit_unit` |

> **Design note**: Not every encounter should offer life restoration — it should
> appear roughly as often as silver shops (1–2 per full run). Life as a limited
> resource only matters if restoration is scarce.

**3. Risk & reward** — validated by both Balatro and The Bazaar.

Already proposed in §9.4 (`dark_ritual`, `soul_trade`). The Bazaar confirms this
category is essential, with 8+ encounters spanning borrow/invest/mystery/gamble
subtypes. Mana Battle should start with 2–3 risk encounters and expand based on
playtest feedback.

### 10.3. What NOT to copy from The Bazaar

- **Gold economy** — already decided against (§8). The Bazaar needs it for
  multi-item shops; Mana Battle doesn't.
- **Minigames** (fishing, racing) — flavor content with no strategic interaction
  with the card/combat loop. High implementation cost, low payoff.
- **Named NPCs** — requires a character/story system that doesn't exist and
  isn't planned. The 10 themed locations (Armory, Frontier Fort, etc.) provide
  adequate flavor.
- **Optional combat** — Mana Battle's "3 encounters → mandatory combat →
  upgrade" rhythm is its structural identity. Making combat optional would
  weaken the risk of a bad build.
- **Exploration locations** — The Bazaar's location encounters are mostly
  re-skinned shops/item-givers. Mana Battle's themed encounter names already
  serve this purpose.

### 10.4. Prioritized additions (updated)

Incorporating The Bazaar's lessons alongside Balatro's:

| Priority | Category | Encounters | Effort | Validated by |
| :--- | :--- | :--- | :--- | :--- |
| **P1** | Risk/reward | `dark_ritual`, `soul_trade` | 2–3 days | Balatro, The Bazaar |
| **P1** | Upgrade/manipulation | `training_grounds` (free rank 2 upgrade) | 2–3 days | The Bazaar |
| **P2** | Health/resource | `rest_inn`, `battle_rations` | 3–4 days | The Bazaar |
| **P2** | Skip rewards | Favor tokens | 2–3 days | Balatro (Tags) |
| **P2** | Upgrade/manipulation | `enchanters_tower`, `scrap_salvage` | 1 week | The Bazaar |
| **P3** | Strategy leveling | `tome_of_*` | 1–2 weeks | Balatro (Planets) |
| **P3** | Upgrade/manipulation | `reforge` (swap action type) | 1 week | The Bazaar (Form) |
| **P3** | Health/resource | `field_hospital`, `desperate_pact` | 4–5 days | The Bazaar |
| **P3** | Hub Shop | Multi-item shop phase | 3–4 weeks | Balatro, The Bazaar |

