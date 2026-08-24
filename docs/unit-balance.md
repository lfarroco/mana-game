# Unit Power & Cost Calculation System

> **Design context:** the tier system this math backs (bronze/silver/gold roles,
> the upgrade curve, card authoring rules) is described in
> [card-design-philosophy.md](card-design-philosophy.md).

## 1. Game Structure

- Each player has a 3×3 board (9 slots).
- Each player has a Crystal unit.
- Units cannot target other units with damage/heal/etc.
- All damage, healing, shielding, poison, and regeneration target Crystals only.
- Units may apply haste or slow to other units.
- Units may have reactions that trigger based on other units' actions.
    - Reactions trigger 200 ms after the event that caused them.
- Units act continuously during combat.

## 2. Unit Budget

- Every unit has a total budget of 100 points.
- The unit's strength is evaluated as **Actual Power (AP)**, measured in points per 5 seconds.
- A unit is balanced if:
  > Actual Power ≈ 100 ± 10

## 3. Cooldown System

- **Base cooldown** = 5 seconds.
- A unit with cooldown `C` uses its actions every `C` seconds.
- Faster cooldowns increase output proportionally.
- Slower cooldowns reduce output proportionally.

## 4. Action vs Reaction Budget Separation

The budget is conceptually divided into:

- **Actions** (things the unit does on its own turn)
- **Reactions** (things the unit does in response to events)

This separation exists because:
- Reactions are always "armed" regardless of cooldown.
- A very strong reaction with a long cooldown is still dangerous.
- Actions can safely scale with cooldown; reactions cannot.

## 5. Time Normalization (Critical Adjustment)

All effects are normalized to a **5-second window**.

This ensures:
- Fast and slow units are directly comparable.
- Haste and slow can be evaluated mathematically.
- Reactions are priced based on how often they actually occur.

## 6. Action Power Calculation

**Definitions**
- `C` = unit cooldown (seconds)
- `A` = total value of the unit's action effects per use
- `B` = base cooldown = 5 seconds

**Formula**
> Action Power per 5s = A × (B / C)

This represents how much value the unit produces through actions over 5 seconds.

## 7. Reaction Power Calculation (Adjusted)

Reactions are priced based on expected value over time, not just effect strength.

**Definitions**
- `R` = reaction value per trigger (effect cost × targeting × discounts)
- `T` = expected number of triggers per 5 seconds
- `D` = reaction delay modifier (0.9 due to 200 ms delay)

**Formula**
> Reaction Power per 5s = R × T × D

**Important adjustment:**
Trigger frequency (`T`) must be estimated based on:
- Source unit cooldowns
- Number of valid sources
- Trigger conditions ("any", "damage", "poison", etc.)


### 7.1. Trigger Frequency Implementation

The trigger frequency `T` is calculated as:

> T = √(number of sources) × base frequency

**Diminishing Returns**: The square root scaling prevents reaction spam from being overpowered. With 8 allies, you get √8 ≈ 2.83× triggers, not 8×.

**Composition-dependent variance**: The model assumes an "average" board composition
for `base_freq`, but real boards concentrate on specific effect types. A board with
5+ poison units will fire `poison` reactions far more than the model's generic 1.0/source
base frequency estimates. Conversely, a reaction keyed to `haste` (base freq 0.5) on a
board with a single haste source fires well below estimate. The √n scaling dampens
this variance but does not eliminate it. When designing a card with a narrow reaction
condition (e.g. `reaction("poison", "allies", ...)`), consider both the **average**
board scenario (the model) and the **dedicated** scenario (a player who fills the board
with poison units). If the dedicated scenario produces AP more than 2× the band ceiling,
the card is degenerate in that composition and needs a narrower position or a cap.

**Base Frequencies** (per source per 5 seconds):

| Effect Type | Base Frequency | Reasoning |
| :--- | :--- | :--- |
| damage | 2.0 | Most common effect (units attack frequently) |
| all | 1.5 | Catches multiple basic effect types |
| heal, shield, poison, regen | 1.0 | Standard frequency |
| haste, slow | 0.5 | Less common support effects |
| on_crit | 0.4 | Rare (depends on critical chance) |
| every_X | 1.0 | Threshold-based, hard to estimate |

**Source Counts** (approximate):

| Position | Sources |
| :--- | :--- |
| all | 16 (both teams) |
| allies | 8 |
| enemies | 9 |
| row_allies, column_allies | 3 |
| directional (top, bottom, left, right) | 1 |
| self | 1 |

## 8. Actual Power (AP)

The unit's Actual Power is:
> AP = Action Power per 5s + Reaction Power per 5s

This value is compared against the 100-point budget.

## 9. Effect Cost Baselines

| Core effects | Base Cost |
| :--- | :--- |
| Damage / Heal | 2 × Power |
| Shield | 1.6 × Power |
| Poison / Regen | 2 × Power |
| Haste / Slow (base) | 15 |
| Increase Power (temporary) | 4 × Amount |
| Increase Power (permanent) | 10 × Amount |
| Decrease Power (temporary) | 4 × Amount |
| Decrease Power (permanent) | 10 × Amount |
| Multiply Power | 4 × (Multiplier - 1) × Unit Power |
| Critical Chance | 4 × % |
| Distribute Power | 4 × 20 (estimated avg redistribution) |
| Absorb Power (temporary) | 4 × 15 × 2 (double swing) |
| Absorb Power (permanent) | 10 × 15 × 2 (double swing) |

### 9.1. Team-Harming Effects

Some effects can harm your own team or benefit enemies. These are valued as **negative costs**:

- **Increase Power on enemies** → negative value
- **Decrease Power on allies** → negative value  
- **Increase Critical on enemies** → negative value
- **Multiply Power on enemies** → negative value
- **Haste on enemies** → negative value
- **Slow on allies** → negative value

Units with significant team-harming effects will have negative or very low AP scores. This is intentional for units designed with high-risk mechanics or flavor-based drawbacks.


## 10. Targeting Multipliers (Adjusted)

Targeting increases effect cost based on effective number of targets, with diminishing returns.

| Target Type | Raw Targets | Effective Targets | Target Multiplier |
| :--- | :--- | :--- | :--- |
| Directional | 1 | 1 | 1 |
| Row / Column | 2–3 | √n | √2 ≈ 1.41 / √3 ≈ 1.73 |
| All Allies | up to 8 | √n | √8 ≈ 2.83 |
| All Enemies | up to 9 | √n | 3 |

> Target Multiplier = √(number of possible targets)

This prevents wide targeting from scaling linearly.

## 11. Conditional Discounts

Effects restricted by condition (e.g., "only poison", "only damage") receive a 30% cost reduction:

> Conditional Modifier = 0.7

## 12. Haste and Slow

Haste and slow are evaluated by how much extra or reduced action output they cause.

**Definitions**
- `s` = speed multiplier (2 = haste, 0.5 = slow)
- `d` = duration (seconds)
- `Cₜ` = target cooldown
- `Aₜ` = target action value per use

**Extra cooldown progress**
> Extra Progress = (s − 1) × d

**Extra (or lost) actions**
> Extra Actions = Extra Progress / Cₜ

**Actual Power change**
> ΔAP = Aₜ × Extra Actions

- Positive ΔAP = haste benefit
- Negative ΔAP = slow penalty

This value is multiplied by:
- Number of affected targets
- Expected applications per 5 seconds

## 13. Pricing Reactions that Apply Haste or Slow

When a reaction applies haste or slow:
1. Calculate ΔAP for each expected target.
2. Multiply by expected trigger frequency per 5 seconds.
3. Attribute the resulting power to the source unit's reaction budget.

This ensures support units pay the full cost of enabling engines.

## 14. Effect Slots

- Each unit has **3 total effect slots** (actions + reactions).
- Every unit — regular cards and core crystals alike — must have at least one
  **basic effect**: an effect of type `damage`, `heal`, `shield`, `poison`, or
  `regen` (the **basic types**). This is the baseline every kit is built around;
  the balance test enforces it across the entire card pool with no exceptions.
- Slot limits are a hard cap to prevent over-stacking efficiency.

## 15. Final Validation Rule

A unit is considered balanced if:
> 90 ≤ AP ≤ 110

## 16. On Scaling
Combat is expected to last for 30 seconds.
Effects that scale (like increasing power) are expected to yield "profit" over raw damage/heal at the 15/20 second mark.
Permanent power increases (they last even for future combats) are expected to cost 5x more than temporary power increases.

**Permanent power viability concern**: The 5× multiplier (10×amount vs 4×amount for
temporary) means a permanent-power unit is severely under-statted in its first combat.
If a run averages 6 combats, the unit must survive ~3–4 combats just to break even on
its AP investment versus a temporary-power equivalent. In short runs, or when recruited
late, permanent-power units are trap picks — they look like an investment but never pay off.
Consider whether the multiplier should be softer (e.g. 3× → 6×amount) with a compensating
"ramp-up tax" (the unit starts at base power and scales over combats, so early battles
are harder). The current pricing favors permanent power only on already-strong units
that don't need the ramp, defeating the design intent.

**Adjust balance by:**
- Changing cooldown
- Changing effect magnitude
- Changing trigger frequency
- Changing targeting scope

## 17. Charge & Power Multiplication (Design Restrictions)

Two effects compound with themselves and each other, so they carry hard caps:

### Charge

- **Per-cast cap: 300 ms.** Charge grants instant cooldown progress. Anything
  larger (the old 1 s steps) lets units act almost continuously, and charge
  stacks linearly across multiple chargers.
- **Reactions that grant charge must key off a specific effect from a specific
  directional ally** (e.g. `damage` from `left_ally`). Broad triggers
  (`"all"`, or row/column/allies positions) fire too often and are not allowed.
- This restriction is "expressed by AP prices": the reaction model (§7) prices
  narrow directional triggers (1 source) far below broad ones (3–8 sources), so
  a broad charge reaction would blow its budget.

### Power Multiplication

- **Gold-only** and **cooldown ≥ 8000 ms** (≤ 3 uses per 30 s combat).
  Multiplication is exponential; combined with charge/haste it produces runaway
  values, so it must be a rare, slow build-around effect.
- Priced at **8 × (Multiplier − 1) × Power** per use — double the flat
  multiplier cost — to reflect its compounding nature.

## 18. Open Issues

The following are known limitations of the AP model that should be revisited
as the card pool grows. See [card-system-risks-and-roadmap.md](card-system-risks-and-roadmap.md)
for the full improvement plan.

1. **AP band overlap**: Bronze [80, 160], Silver [120, 260], Gold [150, 320].
   These bands overlap substantially. A silver at 120 AP with an inactive reaction
   is strictly weaker than a bronze at 140 AP — the player paid 15g for a worse card.
   The bands were widened to accommodate the upgrade curve, but the overlap creates
   "feels-bad" shop moments. Consider tightening the bands after the silver pool
   is filled out and there is more playtest data on actual versus modeled performance.
2. **Permanent power cost**: The 5× multiplier may be too punitive (see §16).
   Collect data on how often permanent-power units are picked, at what round, and
   whether they survive to profitability.
3. **Haste/slow pricing assumption**: ΔAP depends on the target's action value and
   cooldown, which the model estimates generically. A haste caster that consistently
   targets the board's highest-power unit produces ΔAP far above the model's estimate.
   Consider whether haste/slow should be priced more conservatively or whether targeting
   should be restricted for haste effects (e.g. haste always hits `randomAlly`, never
   a specific position).
4. **On-hit scaling**: `every_100_damage`, `every_100_shield`, etc. use a flat base
   frequency of 1.0, but the actual trigger rate depends on the total damage/shield
   output of the entire board — a value that changes dramatically as units scale up
   their power. These triggers are inherently self-accelerating and may need caps
   on per-combat activations.

## Summary

This system:
- Converts all effects into expected value per 5 seconds
- Prevents reaction abuse by pricing trigger frequency
- Makes haste and slow mathematically precise
- Allows easy spreadsheet modeling and AI evaluation
- Keeps all units comparable under a single Actual Power metric
