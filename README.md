# Mana Battle

You can play it for free on [itch](https://lfarroco.itch.io/mana-battle).

The [Steam](https://store.steampowered.com/app/3757600/Mana_Battle) version offers Achievements and Cloud Saves.

A PVE, trigger-based autobattler in a 3x3 board, built with Phaser 3.

## Overview

**Mana Battle** is a strategic auto-battler where players build teams, manage resources, and engage in tactical combat. Key features:

- Real-time tactical combat with unit synergies
- Unit management and progression system
- Steam achievements and cloud saves
- Cross-platform: Windows, macOS, Linux

## Quick Start

```bash
cd phaser
npm install
npm run dev
```

Opens at `http://localhost:8080`

## Key Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production web build |
| `npm run electron:dev` | Run desktop app |
| `npm run electron:build:all` | Build for all platforms |
| `npm run test` | Run all tests |

## Tech Stack

- **Phaser 3** - Game engine
- **TypeScript** - Language
- **Electron** - Desktop wrapper
- **Steam** - Achievements & cloud saves

## Links

- [Repository](https://github.com/lfarroco/mana-game)
- [Issues](https://github.com/lfarroco/mana-game/issues)

## Unit Power & Cost Calculation System

### 1. Game Structure

- Each player has a 3×3 board (9 slots).
- Each player has a Crystal unit.
- Units cannot target other units with damage/heal/etc.
- All damage, healing, shielding, poison, and regeneration target Crystals only.
- Units may apply haste or slow to other units.
- Units may have reactions that trigger based on other units’ actions.
    - Reactions trigger 200 ms after the event that caused them.
- Units act continuously during combat.

### 2. Unit Budget

- Every unit has a total budget of 100 points.
- The unit’s strength is evaluated as **Actual Power (AP)**, measured in points per 5 seconds.
- A unit is balanced if:
  > Actual Power ≈ 100 ± 10

### 3. Cooldown System

- **Base cooldown** = 5 seconds.
- A unit with cooldown `C` uses its actions every `C` seconds.
- Faster cooldowns increase output proportionally.
- Slower cooldowns reduce output proportionally.

### 4. Action vs Reaction Budget Separation

The budget is conceptually divided into:

- **Actions** (things the unit does on its own turn)
- **Reactions** (things the unit does in response to events)

This separation exists because:
- Reactions are always “armed” regardless of cooldown.
- A very strong reaction with a long cooldown is still dangerous.
- Actions can safely scale with cooldown; reactions cannot.

### 5. Time Normalization (Critical Adjustment)

All effects are normalized to a **5-second window**.

This ensures:
- Fast and slow units are directly comparable.
- Haste and slow can be evaluated mathematically.
- Reactions are priced based on how often they actually occur.

### 6. Action Power Calculation

**Definitions**
- `C` = unit cooldown (seconds)
- `A` = total value of the unit’s action effects per use
- `B` = base cooldown = 5 seconds

**Formula**
> Action Power per 5s = A × (B / C)

This represents how much value the unit produces through actions over 5 seconds.

### 7. Reaction Power Calculation (Adjusted)

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
- Trigger conditions (“any”, “damage”, “poison”, etc.)

### 8. Actual Power (AP)

The unit’s Actual Power is:
> AP = Action Power per 5s + Reaction Power per 5s

This value is compared against the 100-point budget.

### 9. Effect Cost Baselines

| Core effects | Base Cost |
| :--- | :--- |
| Damage / Heal | 2 × Power |
| Shield | 1.6 × Power |
| Poison / Regen | 2 × Power |
| Haste / Slow (base) | 15 |
| Increase Power (temporary) | 4 × Power |
| Increase Power (permanent) | 10 × Power |
| Critical Chance | 4 × % |

### 10. Targeting Multipliers (Adjusted)

Targeting increases effect cost based on effective number of targets, with diminishing returns.

| Target Type | Raw Targets | Effective Targets | Target Multiplier |
| :--- | :--- | :--- | :--- |
| Directional | 1 | 1 | 1 |
| Row / Column | 2–3 | √n | √2 ≈ 1.41 / √3 ≈ 1.73 |
| All Allies | up to 8 | √n | √8 ≈ 2.83 |
| All Enemies | up to 9 | √n | 3 |

> Target Multiplier = √(number of possible targets)

This prevents wide targeting from scaling linearly.

### 11. Conditional Discounts

Effects restricted by condition (e.g., “only poison”, “only damage”) receive a 30% cost reduction:

> Conditional Modifier = 0.7

### 12. Haste and Slow

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

### 13. Pricing Reactions that Apply Haste or Slow

When a reaction applies haste or slow:
1. Calculate ΔAP for each expected target.
2. Multiply by expected trigger frequency per 5 seconds.
3. Attribute the resulting power to the source unit’s reaction budget.

This ensures support units pay the full cost of enabling engines.

### 14. Effect Slots

- Each unit has **3 total effect slots** (actions + reactions).
- Every unit must have at least one basic action.
- Slot limits are a hard cap to prevent over-stacking efficiency.

### 15. Final Validation Rule

A unit is considered balanced if:
> 90 ≤ AP ≤ 110

**Adjust balance by:**
- Changing cooldown
- Changing effect magnitude
- Changing trigger frequency
- Changing targeting scope

### Summary

This system:
- Converts all effects into expected value per 5 seconds
- Prevents reaction abuse by pricing trigger frequency
- Makes haste and slow mathematically precise
- Allows easy spreadsheet modeling and AI evaluation
- Keeps all units comparable under a single Actual Power metric