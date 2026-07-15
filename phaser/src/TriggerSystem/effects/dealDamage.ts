import * as Force from "@Models/Entities/Force";
import * as Unit from "@Models/Entities/Unit";
import * as CombatStatsTracker from "@Systems/CombatStatsTracker";
import * as Card from "@Models/Entities/Card";
import * as CombatTypes from "@Core/Combat/CombatTypes";

const DEFAULT_PROJECTILE_DURATION = 400;

export function dealDamageLogicIO(env: CombatTypes.CombatEnvironment, sourceUnit: Unit.Unit, scale: number = 1, delayedExecution?: number) {
	const damageAmount = sourceUnit.power;

	const targetForce = env.state.battleData.forces.find(
		(force: { id: string }) => force.id !== sourceUnit.force
	)!;

	const enemyCore = Card.getEnemyCore(env.state)(sourceUnit.force);

	const crit = Unit.calculateCritical(sourceUnit);
	const damage = ((damageAmount + crit.bonusPower) * crit.multiplier) * scale;

	const actualLifeChanged = Force.applyDamageToForce(
		env.state,
		targetForce,
		damage,
		0,
		"normal",
		crit.isCritical,
	);

	const { combatStates } = env;
	CombatStatsTracker.trackDamage(combatStates.combatStatsTrackerState, env, sourceUnit.id, actualLifeChanged);

	if (crit.isCritical) {
		env.processReactions(env, sourceUnit, { id: "on_crit" }, 1);
	}

	if (sourceUnit.lifesteal) {
		Force.manipulateCoreLife(
			env.state,
			Force.getUnitForce(env.state, sourceUnit.force),
			damage,
			false,
		);
	}

	if (enemyCore.reflect) {
		const reflected = (damage * enemyCore.reflect) / 100;

		if (reflected > 0) {
			const actualReflectedChange = Force.applyDamageToForce(
				env.state,
				targetForce,
				reflected,
				0,
				"normal",
				false,
			);

			const { combatStates } = env;
			CombatStatsTracker.trackDamage(combatStates.combatStatsTrackerState, env, enemyCore.id, actualReflectedChange);
		}
	}

	env.logger.log({
		type: "damage",
		frame: env.logger.getCurrentFrame(),
		sourceId: sourceUnit.id,
		targetId: enemyCore!.id,
		amount: damage,
		duration: DEFAULT_PROJECTILE_DURATION,
		delayed: delayedExecution,
		applyTime: env.logger.getCurrentFrame() + Math.ceil(DEFAULT_PROJECTILE_DURATION / 16.67),
	});
}