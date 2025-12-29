import { State } from "@Models/State";
import { CombatRunner, WaveOutcome } from "./RunCombatCore";
import { CombatLogEntry } from "./ServerCombatEffects";
import { CombatEffects } from "./CombatEnvironment";
import * as CombatSystemStates from "./Systems/CombatSystemStates";
import { initializePoisonSystem } from "./Systems/PoisonDamageSystem";
import { initializeRegenSystem } from "./Systems/RegenSystem";
import { initialize as initializeCombatStatsTracker } from "./Systems/CombatStatsTracker";

type ScheduledAnimation = {
	log: CombatLogEntry;
	startTime: number;
	endTime: number;
	executed: boolean;
};

type PlaybackState = {
	active: boolean;
	currentTime: number;
	animations: ScheduledAnimation[];
	outcome: WaveOutcome | null;
	combatStates: CombatSystemStates.CombatSystemStates;
};

export const createCombatPlaybackController = (
	state: State,
	logs: CombatLogEntry[],
	effects: CombatEffects
): CombatRunner => {
	const FRAME_DURATION = 16.67;

	const forceStatsState = effects.initForceStats ? effects.initForceStats() : null;

	const combatStates: CombatSystemStates.CombatSystemStates = {
		poisonSystemState: initializePoisonSystem(),
		regenSystemState: initializeRegenSystem(),
		combatStatsTrackerState: initializeCombatStatsTracker(state),
		forceStatsState,
	};

	const playbackState: PlaybackState = {
		active: true,
		currentTime: 0,
		animations: [],
		outcome: null,
		combatStates,
	};

	const blackHoleState = effects.initBlackHole ? effects.initBlackHole() : null;
	if (blackHoleState && blackHoleState.blackHole) {
		blackHoleState.blackHole.setVisible(false);
	}

	const scheduleAnimations = () => {
		logs.forEach(log => {
			const startTime = log.frame * FRAME_DURATION;
			const duration = log.duration || 0;
			const endTime = startTime + duration;

			playbackState.animations.push({
				log,
				startTime,
				endTime,
				executed: false,
			});

			if (log.type === "outcome") {
				playbackState.outcome = log.result;
			}
		});

		playbackState.animations.sort((a, b) => a.startTime - b.startTime);
	};

	const executeAnimation = async (animation: ScheduledAnimation) => {
		const { log } = animation;

		switch (log.type) {
			case "damage":
				effects.onDamage?.(log.sourceId, log.targetId, log.amount, () => { });
				break;
			case "heal":
				effects.onHeal?.(log.sourceId, log.targetId, log.amount, () => { });
				break;
			case "shield":
				const shieldTarget = state.battleData.units.find(u => u.id === log.targetId);
				if (shieldTarget) {
					effects.updateShieldDisplay(shieldTarget.force, shieldTarget.shield + log.amount, log.amount, playbackState.combatStates.forceStatsState);
				}
				effects.onShield?.(log.sourceId, log.targetId, log.amount, () => { });
				break;
			case "poison":
				const poisonTarget = state.battleData.units.find(u => u.id === log.targetId);
				if (poisonTarget) {
					const poisonSystem = require("./Systems/PoisonDamageSystem");
					const newPoisonRate = poisonSystem.getPoisonRate(playbackState.combatStates.poisonSystemState, poisonTarget.force);
					effects.updatePoisonDisplay(poisonTarget.force, newPoisonRate, log.amount);
				}
				effects.onPoison?.(log.sourceId, log.targetId, log.amount, () => { });
				break;
			case "regen":
				const regenTarget = state.battleData.units.find(u => u.id === log.targetId);
				if (regenTarget) {
					const regenSystem = require("./Systems/RegenSystem");
					const newRegenRate = regenSystem.getRegenRate(playbackState.combatStates.regenSystemState, regenTarget.force);
					effects.updateRegenDisplay(regenTarget.force, newRegenRate, log.amount);
				}
				effects.onRegen?.(log.sourceId, log.targetId, log.amount, () => { });
				break;
			case "haste":
				const hasteTarget = state.battleData.units.find(u => u.id === log.targetId);
				if (hasteTarget) {
					effects.onHaste?.(log.sourceId, log.targetId, log.effectDuration, () => {
						hasteTarget.hasted += log.effectDuration;
						effects.onChargeBarUpdate(log.targetId);
					});
				}
				break;
			case "slow":
				const slowTarget = state.battleData.units.find(u => u.id === log.targetId);
				if (slowTarget) {
					effects.onSlow?.(log.sourceId, log.targetId, log.effectDuration, () => {
						slowTarget.slowed += log.effectDuration;
						effects.onChargeBarUpdate(log.targetId);
					});
				}
				break;
			case "charge":
				effects.onCharge?.(log.sourceId, log.targetId, log.amount, () => { });
				break;
			case "increase_power":
				effects.onIncreasePower?.(log.sourceId, log.targetId, () => { });
				break;
			case "decrease_power":
				effects.onDecreasePower?.(log.sourceId, log.targetId, () => { });
				break;
			case "increase_critical":
				effects.onIncreaseCritical?.(log.sourceId, log.targetId, () => { });
				break;
			case "crystal_life":
				effects.updateLifeDisplay(log.force, log.life, 0, playbackState.combatStates.forceStatsState);
				break;
			case "life_display":
				effects.updateLifeDisplay(log.force, log.life, log.delta, playbackState.combatStates.forceStatsState);
				break;
			case "shield_display":
				effects.updateShieldDisplay(log.force, log.shield, log.delta, playbackState.combatStates.forceStatsState);
				break;
			case "regen_display":
				effects.updateRegenDisplay(log.force, log.regen, log.delta);
				break;
			case "poison_display":
				effects.updatePoisonDisplay(log.force, log.poison, log.delta);
				break;
			case "timeout_damage":
				effects.onTimeoutDamageVisual?.(log.force, log.damage, () => { });
				break;
			case "reaction":
				if (effects.onReactionVisual) {
					await effects.onReactionVisual(log.unitId);
				}
				break;
			case "haste_end":
				const hasteEndTarget = state.battleData.units.find(u => u.id === log.unitId);
				if (hasteEndTarget) {
					hasteEndTarget.hasted = 0;
					effects.onChargeBarUpdate(log.unitId);
				}
				break;
			case "slow_end":
				const slowEndTarget = state.battleData.units.find(u => u.id === log.unitId);
				if (slowEndTarget) {
					slowEndTarget.slowed = 0;
					effects.onChargeBarUpdate(log.unitId);
				}
				break;
			case "unit_pop":
				effects.onUnitPop(log.unitId);
				break;
		}

		animation.executed = true;
	};

	const updateChargeBars = (delta: number) => {
		for (const unit of state.battleData.units) {
			const cooldownMultiplier = unit.hasted > 0 ? 0.5 : unit.slowed > 0 ? 2 : 1;
			const chargeRate = 1 / cooldownMultiplier;
			unit.charge += delta * chargeRate;

			if (unit.charge >= unit.cooldown && unit.refresh === 0) {
				unit.charge = unit.charge - unit.cooldown;
				unit.refresh = 16.67;
			}

			unit.refresh = Math.max(0, unit.refresh - delta);
			effects.onChargeBarUpdate(unit.id);
		}
	};

	const updateFrame = (_state: State, _time: number, delta: number): void => {
		if (!playbackState.active) return;

		const scaledDelta = delta * effects.getTimeScale();
		playbackState.currentTime += scaledDelta;

		updateChargeBars(scaledDelta);

		const animationsToExecute = playbackState.animations.filter(
			anim => !anim.executed && anim.startTime <= playbackState.currentTime
		);

		animationsToExecute.forEach(anim => {
			executeAnimation(anim);
		});

		const allAnimationsComplete = playbackState.animations.every(anim => anim.executed);
		const lastAnimationEnded = playbackState.animations.length > 0 &&
			playbackState.currentTime >= Math.max(...playbackState.animations.map(a => a.endTime));

		if (allAnimationsComplete && lastAnimationEnded && playbackState.outcome) {
			finishCombat(state, playbackState.outcome);
		}
	};

	const finishCombat = async (state: State, outcome: WaveOutcome): Promise<void> => {
		if (!playbackState.active) return;

		playbackState.active = false;

		console.log("[CombatPlaybackController] Combat ended. Outcome:", outcome);

		await effects.onCombatEnd(state, outcome, playbackState.combatStates);
	};

	const isActive = (): boolean => {
		return playbackState.active;
	};

	const getEnv = () => {
		return {
			state,
			effects,
			combatStates: playbackState.combatStates,
			processReactions: () => { },
		};
	};

	scheduleAnimations();

	return {
		updateFrame,
		finishCombat,
		isActive,
		getEnv,
	};
};
