import * as Card from "@Models/Entities/Card";
import * as Unit from "@Models/Entities/Unit";
import * as RegenSystem from "@Systems/RegenSystem";
import * as CombatStatsTracker from "@Systems/CombatStatsTracker";
import * as CombatTypes from "@Core/Combat/CombatTypes";
import * as Logger from "@Utils/Logger";

const logger = Logger.createLogger("applyRegen");

const DEFAULT_PROJECTILE_DURATION = 400;

export const applyRegenLogicIO = async (
	env: CombatTypes.CombatEnvironment,
	sourceUnit: Unit.Unit,
	scale: number = 1,
	delayedExecution?: number
) => {
	const baseAmount = sourceUnit.power * 0.1;

	const crit = Unit.calculateCritical(sourceUnit);

	const amount = (baseAmount + crit.bonusPower * 0.1) * crit.multiplier * scale;

	const targetForce = env.state.battleData.forces.find((force) => force.id === sourceUnit.force)!;

	logger.debug(
		`[ApplyRegen] Unit power: ${sourceUnit.power}, Regen rate: ${amount}, Total healing over time: ${amount * 10}`
	);

	// Apply regen immediately (no callback indirection)
	const { combatStates } = env;
	const newRegenState = RegenSystem.applyRegen(
		combatStates.regenSystemState,
		targetForce,
		amount,
		crit.isCritical,
	);

	combatStates.regenSystemState = newRegenState;

	CombatStatsTracker.trackRegen(combatStates.combatStatsTrackerState, env, sourceUnit.id, amount);

	if (crit.isCritical) {
		env.processReactions(env, sourceUnit, { id: "on_crit" }, 1);
	}

	const alliedCore = Card.getAlliedCore(env.state)(sourceUnit.force);

	// Log the event for playback (pure data, no callback)
	env.logger.log({
		type: "regen",
		frame: env.logger.getCurrentFrame(),
		sourceId: sourceUnit.id,
		targetId: alliedCore.id,
		amount: amount,
		duration: DEFAULT_PROJECTILE_DURATION,
		delayed: delayedExecution,
		applyTime: env.logger.getCurrentFrame() + Math.ceil(DEFAULT_PROJECTILE_DURATION / 16.67),
	});
};