# Trigger System

The **Trigger System** is the core mechanic of Mana Battle's combat. It functions on an **Action-Reaction** model where units perform effects (Actions) which can then trigger other units to perform their own effects (Reactions).

## Core Concepts

### Actions (Effects)
Every unit has a set of `effects` that they perform when their cooldown completes (or when triggered by a reaction). These are the primary actions of the unit.

### Reactions
Units can also have `reactions`. A reaction allows a unit to "listen" for a specific event happening on the board and respond immediately with an effect.

This creates chains of potential combos:
1. Unit A finishes cooldown and casts **Heal**.
2. Unit B (a teammate) has a reaction: "When an ally **Heals**, cast **Shield** on self".
3. Unit B immediately casts **Shield**.

## Anatomy of a Reaction

A reaction is defined by three main components:

1.  **Trigger Condition (`EffectId`)**: What type of effect are we listening for? (e.g., `damage`, `heal`, `shield`, `poison`).
2.  **Source Position (`EffectSourcePosition`)**: Where must the event originate from relative to this unit?
    *   `allies`: Any unit on the same team.
    *   `enemies`: Any unit on the opposing team.
    *   `row_allies`: Allies in the same horizontal row.
    *   `column_allies`: Allies in the same vertical column.
    *   `self`: This unit itself.
    *   `top_ally`, `bottom_ally`, `left_ally`, `right_ally`: Specific adjacent allies.
    *   `all`: Any unit on the board.
3.  **Response (`Effect`)**: What triggers when the condition is met.

### Example
```typescript
{
    // Trigger: When 'damage' happens...
    effectId: "damage", 
    
    // Position: ...originating from any enemy...
    position: "enemies", 
    
    // Response: ...increase my own power by 2.
    effects: [
        { id: "increase_power", amount: 2, targets: { id: "self" } }
    ]
}
```

## Targeting System

Effects need targets. The targeting system (`Targeting`) defines who receives the effect.

Common targeting options:
- **`self`**: The acting unit.
- **`trigger`**: The unit that caused the reaction (only valid in reactions).
- **`random_ally` / `random_enemy`**: Randomly picks triggered number of targets.
- **`weakest_ally` / `strongest_ally`**: Based on current Power.
- **`weakest_enemy` / `strongest_enemy`**: Based on current Power.
- **`row_allies` / `column_allies`**: Multi-target selection based on grid.
- **`top_ally` / `bottom_ally` / `left_ally` / `right_ally`**: Specific adjacent allies.
- **`all_allies`**: Everyone on the team.
- **`all_enemies`**: Everyone on the opposing team.

## Effect Types

### Basic Abilities
- `damage`: Deals damage equal to Power.
- `heal`: Restores Health equal to Power.
- `shield`: Grants Shield points equal to Power.
- `poison`: Applies Poison stacks equal to Power.
- `regen`: Applies Regen stacks equal to Power.

### Status Effects
- `haste`: Reduces cooldown duration (Speeds up).
- `slow`: Increases cooldown duration (Slows down).
- `charge`: Instantly advances cooldown progress.

### Stat Modifiers
- `increase_power` / `decrease_power`: Modifies a unit's Power stat.
- `multiply_power`: Multiplies current Power.
- `increase_critical`: Increases Critical Hit chance.
- `absorb_power`: Steals Power from target.
- `distribute_power`: Spreads own Power to allies.
- `sacrifice_effect`: Sacrifices own unit for a powerful effect.

### Re-application Effects
- `re_hasted`: Re-applies haste (refreshes duration).
- `re_slow`: Re-applies slow (refreshes duration).

### Global Triggers
These are special "event" triggers that don't come from a specific unit's active skill but from game state changes:
- `on_crit`: Triggers when a Critical Hit happens.
- `on_battle_start`: Triggers once at the beginning of combat.
- `on_over_heal`: Triggers when healing exceeds max life.
- `every_100_damage`: Triggers globally every 100 damage dealt.
- `every_100_heal`, `every_100_shield`: Similar global accumulation triggers.
- `every_10_poison`, `every_10_regen`: Triggers every 10 poison/regen applied.

> **Note**: The `effectId` field in reactions can also be `"all"` to trigger on any effect type.
