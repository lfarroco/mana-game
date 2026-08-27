# Awaken Mechanic

The **Awaken** mechanic gives invested bronze units a gold-tier payoff: when a
bronze-origin unit is promoted **to gold (rank 3)**, the run interrupts into a
special cinematic phase where the player picks one of three offered reactions
("powers") to permanently add to the unit.

## Why

Bronze units are the reliable foundation of the pool (see
[card-design-philosophy.md](card-design-philosophy.md)). Promotions scale their
**power** (linear rank model) but never give them abilities — while silvers and
golds are defined by their reactions. Awaken closes that gap: a bronze unit the
player invests in (two promotions) earns a gold-tier reaction, making the
bronze→silver→gold journey feel like a transformation rather than a stat bump.

## Trigger rule

A unit **awakens** exactly when a promotion action moves a **bronze-origin
unit** (a card whose base `rank === 1`) from rank 2 → rank 3.

- Both promotion paths trigger it: a **duplicate-card buy** in a shop
  (`recruit_unit`) and the **upgrade orb** (`apply_orb`).
- **Silver/gold-origin units never awaken.** A gold card recruited from a gold
  shop arrives at rank 3 without ever passing through rank 2.
- **Cores never awaken** (`isCore` units are excluded from the trigger).
- No extra bookkeeping is needed: bronze cards are only ever recruited at rank
  1, so reaching rank 3 unambiguously means the player promoted them 1→2→3,
  and rank never decreases — the trigger fires **exactly once** per unit.

## Flow

1. A promotion action bumps a bronze unit to rank 3.
2. `SessionTransitions` detects the promotion (`findPromotedToGoldUnit`) and
   routes the session into the **`awaken`** phase instead of advancing:
   - `session.phase = "awaken"`, `session.awakenUnitId = <unit id>`,
   - `session.options` = 3 seeded-random powers (deduped against reactions the
     unit already carries),
   - the current step is preserved — it is consumed when the power resolves.
3. The client `AwakenPhase` plays the cinematic:
   - the other units fade out and the player slot rings vanish,
   - the promoted unit glides to the center of the board,
   - `"{unit} awakens! Choose a new power for it."`,
   - three reaction cards are shown (name + tooltip from the catalog).
4. The player picks a power → `select_encounter` with the power id. The core
   appends `structuredClone(power.reaction)` to the unit's reactions, clears
   `awakenUnitId`, and advances the run. The client plays the golden power-up
   beam (rank display syncs to gold with the beam flash), then the board is
   resummoned.

The phase is **not skippable** (a free reward choice, like `pre_combat`).
Invalid picks (a power id not among the offered options) are rejected and leave
the phase untouched.

## Power catalog

Powers live in `core/src/content/awakenPowers.ts` (`AWAKEN_POWERS`) — pure
data, one `reaction: EffectReaction` per power, with presentation metadata
(icon, color, i18n keys) alongside. Option selection is
`generateAwakenOptions` in `core/src/session/OptionGeneration.ts` (seeded
deterministic, deep-equality deduped).

Balance lens ([unit-balance.md](unit-balance.md)): these are **free bonuses**
stacked on an already-×3-scaled rank-3 unit, so magnitudes are modest — small
flat power grants, single-target buffs, or defensive procs. The one charge
power keys off a specific directional ally (`left_ally`), honoring the §17
broad-charge anti-pattern. The catalog's structural rules mirror the
BaseCollection balance suite (no dead `"self"` reactions, `"enemies"`
reactions set `triggerTeam: "enemy"`) and are enforced by
`core/src/content/awakenPowers.test.ts`.

## Files

| Area | File |
| :--- | :--- |
| Power catalog | `core/src/content/awakenPowers.ts` |
| Catalog tests | `core/src/content/awakenPowers.test.ts` |
| Option generation | `core/src/session/OptionGeneration.ts` (`generateAwakenOptions`) |
| Promotion detection + routing | `core/src/session/SessionTransitions.ts` |
| Session type | `core/src/types/session.ts` (`"awaken"` phase, `awakenUnitId`) |
| Option type | `core/src/types/action.ts` (`{ id: AwakenPowerId }`) |
| Cinematic phase | `phaser/src/Screens/Battleground/Phases/Awaken/handleAwakenPhase.ts` |
| Board slot visibility | `phaser/src/Components/Board/Board.ts` (`setPlayerSlotsVisible`) |
| i18n | `phaser/src/i18n/en.json` (`awaken.*`, `awakenPowers.*`) |
