these are the design guidelines:
- all units have one basic action. those actions are damage/heal/shield/poison/regen.
- a unit cant have two basic actions 
- core units (isCore: true) can have 3 effects/reactions. this means 1 basic action + either 3 actions, 1 action 2 reactions or 2 actions and 1 reaction.
- bronze units have 2 effects/reactions. 1 base action, and either another 1 action or 1 reaction
- silver/gold units have a pool of 3, like cores
- cooldown is used to balance actions, not reactions. so a unit with a long cooldown of 20s to compensate for an op reaction is not valid, because reactions are always active. cooldown just balances actions (effects)
- reactions with effect "all" should be restricted to row/column positions or more restrictive
- in the same way, reactions to any position should be avoided, and when used should have at least ofType
you will notice that almost all units have reactions currently. that needs to change. keep the reaction only if it really fits the unit's flavor. if a bronze unit has a reaction, it should have only a basic effect alongside it.