import { State } from "@Models/State";
import { CombatRunner, WaveOutcome } from "./RunCombatCore";
import { CombatLogEntry } from "./ServerCombatEffects";
import { CombatEffects } from "./CombatEnvironment";
import * as CombatSystemStates from "@Systems/CombatSystemStates";
import { initializePoisonSystem } from "@Systems/PoisonDamageSystem";
import { initializeRegenSystem } from "@Systems/RegenSystem";
import { initialize as initializeCombatStatsTracker } from "@Systems/CombatStatsTracker";

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
	blackHoleState?: any;
	countdownTimerState?: any;
};

// Must match ServerConstants.MIN_COOLDOWN
const MIN_COOLDOWN = 200;

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

	CombatSystemStates.setCombatSystemStates(combatStates);

	const blackHoleState = effects.initBlackHole ? effects.initBlackHole() : null;
	if (blackHoleState && blackHoleState.blackHole) {
		blackHoleState.blackHole.setVisible(false);
	}

	let countdownTimerState = effects.initCountdownTimer ? effects.initCountdownTimer(blackHoleState) : null;
	if (countdownTimerState && effects.startCountdownTimer) {
		countdownTimerState = effects.startCountdownTimer(countdownTimerState);
	}

	const playbackState: PlaybackState = {
		active: true,
		currentTime: 0,
		animations: [],
		outcome: null,
		combatStates,
		blackHoleState,
		countdownTimerState,
	};

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
				effects.onShield?.(log.sourceId, log.targetId, log.amount, () => { });
				break;
			case "poison":
				effects.onPoison?.(log.sourceId, log.targetId, log.amount, () => { });
				break;
			case "regen":
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
				const chargeTarget = state.battleData.units.find(u => u.id === log.targetId);
				if (chargeTarget) {
					effects.onCharge?.(log.sourceId, log.targetId, log.amount, () => {
						chargeTarget.charge += log.amount;
						effects.onChargeBarUpdate(log.targetId);
					});
				}
				break;
			case "increase_power":
				const powerTarget = state.battleData.units.find(u => u.id === log.targetId);
				if (powerTarget) {
					effects.onIncreasePower?.(log.sourceId, log.targetId, log.amount, log.permanent, () => {
						powerTarget.power += log.amount;
						if (log.permanent) {
							powerTarget.bonusPower += log.amount;
						}
					});
				}
				break;
			case "decrease_power":
				const decreaseTarget = state.battleData.units.find(u => u.id === log.targetId);
				if (decreaseTarget) {
					effects.onDecreasePower?.(log.sourceId, log.targetId, log.amount, log.permanent, () => {
						decreaseTarget.power -= log.amount;
						if (log.permanent) {
							decreaseTarget.bonusPower -= log.amount;
						}
					});
				}
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
			case "combat_stats":
				if (playbackState.combatStates.combatStatsTrackerState) {
					playbackState.combatStates.combatStatsTrackerState.unitStats = new Map(log.unitStats);
					playbackState.combatStates.combatStatsTrackerState.currentCombatStats = new Map(log.currentCombatStats);
				}
				break;
		}

		if (log.type === "storm_start") {
			if (playbackState.blackHoleState && playbackState.blackHoleState.blackHole) {
				playbackState.blackHoleState.blackHole.setVisible(true);
			}
		}

		animation.executed = true;
	};

	const updateChargeBars = (delta: number) => {
		for (const unit of state.battleData.units) {
			const cooldownMultiplier = (unit.hasted > 0 && unit.slowed > 0) ? 1 : unit.hasted > 0 ? 0.5 : unit.slowed > 0 ? 2 : 1;
			const chargeRate = 1 / cooldownMultiplier;
			unit.charge += delta * chargeRate;

			if (unit.charge >= unit.cooldown && unit.refresh === 0) {
				unit.charge = unit.charge - unit.cooldown;
				unit.refresh = MIN_COOLDOWN;
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

		if (playbackState.countdownTimerState && effects.stopCountdownTimer) {
			playbackState.countdownTimerState = effects.stopCountdownTimer(playbackState.countdownTimerState);
		}

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
