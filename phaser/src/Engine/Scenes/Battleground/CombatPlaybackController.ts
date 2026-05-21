import { State } from "@Models/State";
import { CombatRunner, WaveOutcome } from "@Scenes/Battleground/RunCombatCore";
import { CombatLogEntry } from "@Core/Combat/ServerCombatEffects";
import { CombatEffects } from "@Scenes/Battleground/CombatEnvironment";
import type { BlackHoleState } from "@Core/Combat/BlackHoleState";
import type { CountdownTimerState } from "@Systems/CountdownTimer";
import * as CombatSystemStates from "@Systems/CombatSystemStates";
import { initializePoisonSystem } from "@Systems/PoisonDamageSystem";
import { initializeRegenSystem } from "@Systems/RegenSystem";
import { initialize as initializeCombatStatsTracker } from "@Systems/CombatStatsTracker";
import { createLogger } from "@Utils/Logger";
import { initializeForceStatsState } from "@Core/Combat/ForceStatsState";

const logger = createLogger("CombatPlaybackController");

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
	blackHoleState?: BlackHoleState;
	countdownTimerState?: CountdownTimerState;
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
		forceStatsState: forceStatsState ?? initializeForceStatsState(),
	};

	CombatSystemStates.setCombatSystemStates(combatStates);

	const blackHoleState = effects.initBlackHole ? effects.initBlackHole() : null;
	if (blackHoleState && blackHoleState.blackHole) {
		blackHoleState.blackHole.setVisible(false);
	}

	let countdownTimerState = effects.initCountdownTimer
		? effects.initCountdownTimer(blackHoleState)
		: null;
	if (countdownTimerState && effects.startCountdownTimer) {
		countdownTimerState = effects.startCountdownTimer(countdownTimerState);
	}

	const playbackState: PlaybackState = {
		active: true,
		currentTime: 0,
		animations: [],
		outcome: null,
		combatStates,
		blackHoleState: blackHoleState ?? undefined,
		countdownTimerState: countdownTimerState ?? undefined,
	};

	const scheduleAnimations = () => {
		logs.forEach((log) => {
			const startTime = log.frame * FRAME_DURATION;
			const duration = log.duration || 0;
			const endTime = startTime + duration;

			playbackState.animations.push({
				log,
				startTime,
				endTime,
				executed: false,
			});

			if (log.type === "outcome" && log.result) {
				playbackState.outcome = log.result;
			}
		});

		playbackState.animations.sort((a, b) => a.startTime - b.startTime);
	};

	const executeAnimation = async (animation: ScheduledAnimation) => {
		if (!playbackState.active) return;

		try {
			const { log } = animation;

			switch (log.type) {
				case "damage":
					if (!log.sourceId || !log.targetId || log.amount === undefined) break;
					effects.onDamage?.(log.sourceId, log.targetId, log.amount, () => { });
					break;
				case "heal":
					if (!log.sourceId || !log.targetId || log.amount === undefined) break;
					effects.onHeal?.(log.sourceId, log.targetId, log.amount, () => { });
					break;
				case "shield":
					if (!log.sourceId || !log.targetId || log.amount === undefined) break;
					effects.onShield?.(log.sourceId, log.targetId, log.amount, () => { });
					break;
				case "poison":
					if (!log.sourceId || !log.targetId || log.amount === undefined) break;
					effects.onPoison?.(log.sourceId, log.targetId, log.amount, () => { });
					break;
				case "regen":
					if (!log.sourceId || !log.targetId || log.amount === undefined) break;
					effects.onRegen?.(log.sourceId, log.targetId, log.amount, () => { });
					break;
				case "haste":
					if (!log.sourceId || !log.targetId || log.effectDuration === undefined) break;
					const hasteTargetId = log.targetId;
					const hasteDuration = log.effectDuration;
					const hasteTarget = state.battleData.units.find((u) => u.id === hasteTargetId);
					if (hasteTarget) {
						effects.onHaste?.(log.sourceId, hasteTargetId, hasteDuration, () => {
							hasteTarget.hasted += hasteDuration;
							effects.onChargeBarUpdate(hasteTargetId);
						});
					}
					break;
				case "slow":
					if (!log.sourceId || !log.targetId || log.effectDuration === undefined) break;
					const slowTargetId = log.targetId;
					const slowDuration = log.effectDuration;
					const slowTarget = state.battleData.units.find((u) => u.id === slowTargetId);
					if (slowTarget) {
						effects.onSlow?.(log.sourceId, slowTargetId, slowDuration, () => {
							slowTarget.slowed += slowDuration;
							effects.onChargeBarUpdate(slowTargetId);
						});
					}
					break;
				case "charge":
					if (!log.sourceId || !log.targetId || log.amount === undefined) break;
					const chargeTargetId = log.targetId;
					const chargeAmount = log.amount;
					const chargeTarget = state.battleData.units.find((u) => u.id === chargeTargetId);
					if (chargeTarget) {
						effects.onCharge?.(log.sourceId, chargeTargetId, chargeAmount, () => {
							chargeTarget.charge += chargeAmount;
							effects.onChargeBarUpdate(chargeTargetId);
						});
					}
					break;
				case "increase_power":
					if (!log.targetId || log.amount === undefined || log.permanent === undefined) break;
					const powerTargetId = log.targetId;
					const powerAmount = log.amount;
					const powerPermanent = log.permanent;
					const powerTarget = state.battleData.units.find((u) => u.id === powerTargetId);
					if (powerTarget) {
						effects.onIncreasePower?.(
							log.sourceId,
							powerTargetId,
							powerAmount,
							powerPermanent,
							() => {
								powerTarget.power += powerAmount;
								if (powerPermanent) {
									powerTarget.bonusPower += powerAmount;
								}
							}
						);
					}
					break;
				case "decrease_power":
					if (!log.targetId || log.amount === undefined || log.permanent === undefined) break;
					const decreaseTargetId = log.targetId;
					const decreaseAmount = log.amount;
					const decreasePermanent = log.permanent;
					const affectedUnitId = log.affectedUnitId ?? decreaseTargetId;
					const affectedUnit = state.battleData.units.find((u) => u.id === affectedUnitId);
					if (affectedUnit) {
						effects.onDecreasePower?.(
							log.sourceId,
							decreaseTargetId,
							decreaseAmount,
							decreasePermanent,
							() => {
								affectedUnit.power -= decreaseAmount;
								if (decreasePermanent) {
									affectedUnit.bonusPower -= decreaseAmount;
								}
							},
							undefined,
							log.affectedUnitId
						);
					}
					break;
				case "increase_critical":
					if (!log.targetId) break;
					effects.onIncreaseCritical?.(log.sourceId, log.targetId, () => { });
					break;
				case "crystal_life":
					if (!log.force || log.life === undefined) break;
					effects.updateLifeDisplay(
						log.force,
						log.life,
						0,
						playbackState.combatStates.forceStatsState
					);
					break;
				case "life_display":
					if (!log.force || log.life === undefined || log.delta === undefined) break;
					effects.updateLifeDisplay(
						log.force,
						log.life,
						log.delta,
						playbackState.combatStates.forceStatsState
					);
					break;
				case "shield_display":
					if (!log.force || log.shield === undefined || log.delta === undefined) break;
					effects.updateShieldDisplay(
						log.force,
						log.shield,
						log.delta,
						playbackState.combatStates.forceStatsState
					);
					break;
				case "regen_display":
					if (!log.force || log.regen === undefined || log.delta === undefined) break;
					effects.updateRegenDisplay(log.force, log.regen, log.delta);
					break;
				case "poison_display":
					if (!log.force || log.poison === undefined || log.delta === undefined) break;
					effects.updatePoisonDisplay(log.force, log.poison, log.delta);
					break;
				case "timeout_damage":
					if (!log.force || log.damage === undefined) break;
					effects.onTimeoutDamageVisual?.(log.force, log.damage, () => { });
					break;
				case "reaction":
					if (effects.onReactionVisual) {
						if (!log.unitId) break;
						await effects.onReactionVisual(log.unitId);
					}
					break;
				case "haste_end":
					if (!log.unitId) break;
					const hasteEndTarget = state.battleData.units.find((u) => u.id === log.unitId);
					if (hasteEndTarget) {
						hasteEndTarget.hasted = 0;
						effects.onChargeBarUpdate(log.unitId);
					}
					break;
				case "slow_end":
					if (!log.unitId) break;
					const slowEndTarget = state.battleData.units.find((u) => u.id === log.unitId);
					if (slowEndTarget) {
						slowEndTarget.slowed = 0;
						effects.onChargeBarUpdate(log.unitId);
					}
					break;
				case "unit_pop":
					if (!log.unitId) break;
					effects.onUnitPop(log.unitId);
					break;
				case "combat_stats":
					if (
						playbackState.combatStates.combatStatsTrackerState &&
						log.unitStats &&
						log.currentCombatStats
					) {
						playbackState.combatStates.combatStatsTrackerState.unitStats = new Map(log.unitStats);
						playbackState.combatStates.combatStatsTrackerState.currentCombatStats = new Map(
							log.currentCombatStats
						);
					}
					break;
			}

			if (log.type === "storm_start") {
				if (playbackState.blackHoleState && playbackState.blackHoleState.blackHole) {
					playbackState.blackHoleState.blackHole.setVisible(true);
				}
			}

			animation.executed = true;
		} catch (error) {
			logger.warn(
				"[CombatPlaybackController] Error executing animation, scene may be destroyed",
				error
			);
			playbackState.active = false;
		}
	};

	const updateChargeBars = (delta: number) => {
		if (!playbackState.active) return;

		try {
			for (const unit of state.battleData.units) {
				const cooldownMultiplier =
					unit.hasted > 0 && unit.slowed > 0 ? 1 : unit.hasted > 0 ? 0.5 : unit.slowed > 0 ? 2 : 1;
				const chargeRate = 1 / cooldownMultiplier;
				unit.charge += delta * chargeRate;

				if (unit.charge >= unit.cooldown && unit.refresh === 0) {
					unit.charge = unit.charge - unit.cooldown;
					unit.refresh = MIN_COOLDOWN;
				}

				unit.refresh = Math.max(0, unit.refresh - delta);
				effects.onChargeBarUpdate(unit.id);
			}
		} catch (error) {
			logger.warn(
				"[CombatPlaybackController] Error updating charge bars, scene may be destroyed",
				error
			);
			playbackState.active = false;
		}
	};

	const updateFrame = (_state: State, _time: number, delta: number): void => {
		if (!playbackState.active) return;

		try {
			const scaledDelta = delta * effects.getTimeScale();
			playbackState.currentTime += scaledDelta;

			updateChargeBars(scaledDelta);

			const animationsToExecute = playbackState.animations.filter(
				(anim) => !anim.executed && anim.startTime <= playbackState.currentTime
			);

			animationsToExecute.forEach((anim) => {
				executeAnimation(anim);
			});

			const allAnimationsComplete = playbackState.animations.every((anim) => anim.executed);
			const lastAnimationEnded =
				playbackState.animations.length > 0 &&
				playbackState.currentTime >= Math.max(...playbackState.animations.map((a) => a.endTime));

			if (allAnimationsComplete && lastAnimationEnded && playbackState.outcome) {
				finishCombat(state, playbackState.outcome);
			}
		} catch (error) {
			logger.warn("[CombatPlaybackController] Error in updateFrame, stopping playback", error);
			playbackState.active = false;
		}
	};

	const finishCombat = async (state: State, outcome: WaveOutcome): Promise<void> => {
		if (!playbackState.active) return;

		playbackState.active = false;

		if (playbackState.countdownTimerState && effects.stopCountdownTimer) {
			playbackState.countdownTimerState = effects.stopCountdownTimer(
				playbackState.countdownTimerState
			);
		}

		logger.debug("[CombatPlaybackController] Combat ended. Outcome:", outcome);

		await effects.onCombatEnd(state, outcome, playbackState.combatStates);
	};

	const isActive = (): boolean => {
		return playbackState.active;
	};

	const stop = (): void => {
		logger.debug("[CombatPlaybackController] Stopping combat playback");
		playbackState.active = false;
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
		stop,
		getEnv,
	};
};
