import * as Force from "@Models/Entities/Force";
import * as Unit from "@Models/Entities/Unit";
import * as CombatStatsTracker from "@Systems/CombatStatsTracker";
import * as Card from "@Models/Entities/Card";
import * as CombatTypes from "@Core/Combat/CombatTypes";

export function dealDamage(
	env: CombatTypes.CombatEnvironment,
	sourceUnit: Unit.Unit,
	scale: number = 1,
) {
	const { state, combatStates, processReactions, logger } = env;

	const damageAmount = sourceUnit.power;

	const targetForce = state.battleData.forces.find(
		(force: { id: string }) => force.id !== sourceUnit.force
	)!;

	const enemyCore = Card.getEnemyCore(state)(sourceUnit.force);

	const crit = Unit.calculateCritical(sourceUnit);
	const damage = ((damageAmount + crit.bonusPower) * crit.multiplier) * scale;

	const actualLifeChanged = Force.applyDamageToForce(
		state,
		targetForce,
		damage,
		0,
		"normal",
		crit.isCritical,
	);

	CombatStatsTracker.trackDamage(
		combatStates.combatStatsTrackerState,
		env,
		sourceUnit.id,
		actualLifeChanged,
	);

	if (crit.isCritical) {
		processReactions(env, sourceUnit, { id: "on_crit" }, 1);
	}

	if (sourceUnit.lifesteal) {
		Force.manipulateCoreLife(
			state,
			Force.getUnitForce(state, sourceUnit.force),
			damage,
			false,
		);
	}

	logger.log({
		type: "damage",
		sourceId: sourceUnit.id,
		targetId: enemyCore!.id,
		amount: damage,
	});
}