
# Battle System

## Phases

# Combat Phase

- Units with not enough mana to cast their selected skill are set to idle.
- Units whose target is out of range are set to idle.
- Idle units check for any enemies in range. If found, they acquire it as a target.
- Units in combat roll damage and apply it to their target.
- Units casting skills apply the skill effects to their target.

# Cleanup Phase

- Units with over 100% health or mana are set to 100%.
- Units that have 0 or less health are removed from the battlefield.
- Units with less than 0 mana are set to 0.
- Units whose target died are set to idle.
- Units casting whose target died are set to idle.
- Units casting healing skills in a full health target are set to idle.

# Movement Phase

- Idle units with a target path change status to moving.
- Moving units move to their destination. If the destination is blocked:
  - By an enemy: The unit change status to attacking.
  - By an ally: The unit walks towards the target.
- Units that arrived at their destination change status to idle.

# Recovery Phase

- Units recover health and mana based on their recovery rate.

# End Phase

- The battle ends when all units of one side are dead.

## Unit States

- Idle: The unit is not doing anything.
- Moving: The unit is moving to a target destination.
- Attacking: The unit is attacking a target.
- Casting: The unit is casting a skill.
- Dead: The unit is dead.
