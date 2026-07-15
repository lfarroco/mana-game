import * as State from "@Models/State";
import * as RunCombatCore from "@Core/Combat/RunCombatCore";
import * as CombatLogger from "@Core/Combat/CombatLogger";
import type * as BlackHoleState from "@Core/Combat/BlackHoleState";
import type * as CountdownTimer from "@Systems/CountdownTimer";
import * as CombatSystemStates from "@Systems/CombatSystemStates";
import * as PoisonDamageSystem from "@Systems/PoisonDamageSystem";
import * as RegenSystem from "@Systems/RegenSystem";
import * as CombatStatsTracker from "@Systems/CombatStatsTracker";
import * as Logger from "@Utils/Logger";
import * as ForceStatsState from "@Core/Combat/ForceStatsState";
import * as Animations from "@Systems/Chara/Animations";
import * as ChargeBarDisplay from "@Systems/Chara/ChargeBarDisplay";
import * as Chara from "@Systems/Chara/Chara";
import * as ForceStats from "@Screens/Battleground/Components/ForceStats";
import * as Unit from "@Models/Entities/Unit";
import * as AudioManager from "@Systems/AudioManager";
import * as Effects from "Client/FX";
import * as damageFx from "@TriggerSystem/effects/visuals/damage";
import * as healFx from "@TriggerSystem/effects/visuals/heal";
import * as shieldFx from "@TriggerSystem/effects/visuals/shield";
import * as poisonFx from "@TriggerSystem/effects/visuals/poison";
import * as CoreConstants from "@Core/Constants";
import * as Card from "@Models/Entities/Card";
import * as animation from "@Utils/animation";

const logger = Logger.createLogger("CombatPlaybackController");

type ScheduledAnimation = {
	log: CombatLogger.CombatLogEntry;
	startTime: number;
	endTime: number;
	executed: boolean;
};

type PlaybackState = {
	active: boolean;
	currentTime: number;
	animations: ScheduledAnimation[];
	outcome: RunCombatCore.WaveOutcome | null;
	combatStates: CombatSystemStates.CombatSystemStates;
	blackHoleState?: BlackHoleState.BlackHoleState;
	countdownTimerState?: CountdownTimer.CountdownTimerState;
};

// TODO: this is bad
// Must match ServerConstants.MIN_COOLDOWN
const MIN_COOLDOWN = 200;

export const createCombatPlaybackController = (
	logs: CombatLogger.CombatLogEntry[],
	onReplayEnd?: (outcome: RunCombatCore.WaveOutcome) => void
): RunCombatCore.CombatRunner => {
	const FRAME_DURATION = 16.67;

	const { state } = window as unknown as { state: State.State };

	const forceStatsState = ForceStats.initializeForceStatsState();

	const combatStates: CombatSystemStates.CombatSystemStates = {
		poisonSystemState: PoisonDamageSystem.initializePoisonSystem(),
		regenSystemState: RegenSystem.initializeRegenSystem(),
		combatStatsTrackerState: CombatStatsTracker.initialize(state),
		forceStatsState: forceStatsState ?? ForceStatsState.initializeForceStatsState(),
	};

	CombatSystemStates.setCombatSystemStates(combatStates);

	const playbackState: PlaybackState = {
		active: true,
		currentTime: 0,
		animations: [],
		outcome: null,
		combatStates,
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
					AudioManager.playSoundEffect("sfx_spell_truestrike");
					{
						const source = Chara.mustGetCharaById(log.sourceId);
						const target = Chara.mustGetCharaById(log.targetId);
						damageFx.damageFx([source.x, source.y], [target.x, target.y], () => {
							Chara.shake(target);
						});
					}
					break;
				case "heal":
					if (!log.sourceId || !log.targetId || log.amount === undefined) break;
					{
						const source = Chara.mustGetCharaById(log.sourceId);
						const target = Chara.mustGetCharaById(log.targetId);
						healFx.healFx([source.x, source.y], [target.x, target.y], () => {
							Chara.shake(target);
						});
					}
					break;
				case "shield":
					if (!log.sourceId || !log.targetId || log.amount === undefined) break;
					AudioManager.playSoundEffect("sfx_spell_manavortex");
					{
						const source = Chara.mustGetCharaById(log.sourceId);
						const target = Chara.mustGetCharaById(log.targetId);
						shieldFx.shieldFx([source.x, source.y], [target.x, target.y], () => {
							Chara.shake(target);
						});
					}
					break;
				case "poison":
					if (!log.sourceId || !log.targetId || log.amount === undefined) break;
					{
						const source = Chara.mustGetCharaById(log.sourceId);
						const target = Chara.mustGetCharaById(log.targetId);
						poisonFx.poisonFx([source.x, source.y], [target.x, target.y], () => {
							Chara.shake(target);
						});
					}
					break;
				case "regen":
					if (!log.sourceId || !log.targetId || log.amount === undefined) break;
					AudioManager.playSoundEffect("sfx_spell_tranquility");
					{
						const source = Chara.mustGetCharaById(log.sourceId);
						const target = Chara.mustGetCharaById(log.targetId);
						Effects.arcaneMissileTargeted(
							[source.x, source.y],
							[target.x, target.y],
							{
								colors: [0x00ff00, 0x32cd32, 0x7fff00, 0x00ff00],
								amplitudeMin: 5,
								amplitudeMax: 15,
								particleScale: 1.5,
								impact: {
									colors: [0x00ff00, 0x32cd32],
									scale: 2,
									speed: 200,
									lifespan: 300,
									alpha: 0.4,
								},
								onHit: () => { },
							});
					}
					break;
				case "haste":
					if (!log.sourceId || !log.targetId || log.effectDuration === undefined) break;
					{
						const hasteTargetId = log.targetId;
						const hasteDuration = log.effectDuration;
						const hasteTarget = state.battleData.units.find((u) => u.id === hasteTargetId);
						if (hasteTarget) {
							const effect = async () => {
								hasteTarget.hasted += hasteDuration;
								ChargeBarDisplay.updateChargeBar(hasteTargetId);
								Effects.hasteEffect(Chara.mustGetCharaById(hasteTargetId), {
									duration: 1000,
									intensity: 1.5,
									color: 0x00eaff,
								});
							};
							const source = Chara.mustGetCharaById(log.sourceId);
							const target = Chara.mustGetCharaById(hasteTargetId);
							Effects.arcaneMissileTargeted([source.x, source.y], [target.x, target.y], {
								colors: [0x00ffff, 0x87ceeb, 0xadd8e6],
								amplitudeMin: 5,
								amplitudeMax: 15,
								particleScale: 1.5,
								impact: {
									colors: [0x00ffff, 0x87ceeb],
									scale: 2,
									speed: 200,
									lifespan: 300,
									alpha: 0.4,
								},
								onHit: effect,
							});
						}
					}
					break;
				case "slow":
					if (!log.sourceId || !log.targetId || log.effectDuration === undefined) break;
					{
						const slowTargetId = log.targetId;
						const slowDuration = log.effectDuration;
						const slowTarget = state.battleData.units.find((u) => u.id === slowTargetId);
						if (slowTarget) {
							const effect = async () => {
								slowTarget.slowed += slowDuration;
								ChargeBarDisplay.updateChargeBar(slowTargetId);
								Effects.slowEffect(Chara.mustGetCharaById(slowTargetId), {
									duration: 1000,
									intensity: 1.5,
									color: 0xd2691e,
								});
							};
							const source = Chara.mustGetCharaById(log.sourceId);
							const target = Chara.mustGetCharaById(slowTargetId);
							Effects.arcaneMissileTargeted([source.x, source.y], [target.x, target.y], {
								colors: [0x6e260e, 0x7b3f00, 0x6f4e37],
								amplitudeMin: 5,
								amplitudeMax: 20,
								particleScale: 1.5,
								blendMode: Phaser.BlendModes.NORMAL,
								impact: {
									colors: [0x6e260e, 0x954535],
									scale: 2,
									speed: 200,
									lifespan: 300,
									alpha: 0.4,
								},
								onHit: effect,
							});
						}
					}
					break;
				case "charge":
					if (!log.sourceId || !log.targetId || log.amount === undefined) break;
					{
						const chargeTargetId = log.targetId;
						const chargeAmount = log.amount;
						const chargeTarget = state.battleData.units.find((u) => u.id === chargeTargetId);
						if (chargeTarget) {
							const effect = async () => {
								chargeTarget.charge += chargeAmount;
								ChargeBarDisplay.updateChargeBar(chargeTargetId);
								Effects.hasteEffect(Chara.mustGetCharaById(chargeTargetId), {
									duration: 1000,
									intensity: 1.5,
									color: 0xffd700,
								});
							};
							const source = Chara.mustGetCharaById(log.sourceId);
							const target = Chara.mustGetCharaById(chargeTargetId);
							Effects.arcaneMissileTargeted([source.x, source.y], [target.x, target.y], {
								colors: [0xffd700, 0xffa500, 0xff8c00],
								amplitudeMin: 5,
								amplitudeMax: 15,
								particleScale: 1.5,
								impact: {
									colors: [0xffd700, 0xffa500],
									scale: 2,
									speed: 200,
									lifespan: 300,
									alpha: 0.4,
								},
								onHit: effect,
							});
						}
					}
					break;
				case "increase_power":
					if (!log.targetId || log.amount === undefined || log.permanent === undefined) break;
					{
						const powerTargetId = log.targetId;
						const powerAmount = log.amount;
						const powerPermanent = log.permanent;
						const powerTarget = state.battleData.units.find((u) => u.id === powerTargetId);
						if (powerTarget) {
							powerTarget.power += powerAmount;
							if (powerPermanent) {
								powerTarget.bonusPower += powerAmount;
							}
							ChargeBarDisplay.updateChargeBar(powerTargetId);
						}
					}
					break;
				case "decrease_power":
					if (!log.targetId || log.amount === undefined || log.permanent === undefined) break;
					{
						const decreaseTargetId = log.targetId;
						const decreaseAmount = log.amount;
						const decreasePermanent = log.permanent;
						const affectedUnitId = log.affectedUnitId ?? decreaseTargetId;
						const affectedUnit = state.battleData.units.find((u) => u.id === affectedUnitId);
						if (affectedUnit) {
							affectedUnit.power -= decreaseAmount;
							if (decreasePermanent) {
								affectedUnit.bonusPower -= decreaseAmount;
							}
							ChargeBarDisplay.updateChargeBar(affectedUnitId);
						}
					}
					break;
				case "increase_critical":
					break;
				case "crystal_life":
					if (!log.force || log.life === undefined) break;
					ForceStats.updateLifeDisplay(
						log.force,
						log.life,
						0,
						playbackState.combatStates.forceStatsState
					);
					break;
				case "life_display":
					if (!log.force || log.life === undefined || log.delta === undefined) break;
					ForceStats.updateLifeDisplay(
						log.force,
						log.life,
						log.delta,
						playbackState.combatStates.forceStatsState
					);
					break;
				case "shield_display":
					if (!log.force || log.shield === undefined || log.delta === undefined) break;
					ForceStats.updateShieldDisplay(
						log.force,
						log.shield,
						log.delta,
						playbackState.combatStates.forceStatsState
					);
					break;
				case "regen_display":
					if (!log.force || log.regen === undefined || log.delta === undefined) break;
					ForceStats.updateRegenDisplay(log.force, log.regen, log.delta);
					break;
				case "poison_display":
					if (!log.force || log.poison === undefined || log.delta === undefined) break;
					ForceStats.updatePoisonDisplay(log.force, log.poison, log.delta);
					break;
				case "timeout_damage":
					break;
				case "reaction":
					break;
				case "haste_end":
					if (!log.unitId) break;
					{
						const hasteEndTarget = state.battleData.units.find((u) => u.id === log.unitId);
						if (hasteEndTarget) {
							hasteEndTarget.hasted = 0;
							ChargeBarDisplay.updateChargeBar(log.unitId);
						}
					}
					break;
				case "slow_end":
					if (!log.unitId) break;
					{
						const slowEndTarget = state.battleData.units.find((u) => u.id === log.unitId);
						if (slowEndTarget) {
							slowEndTarget.slowed = 0;
							ChargeBarDisplay.updateChargeBar(log.unitId);
						}
					}
					break;
				case "unit_pop":
					if (!log.unitId) break;
					Animations.pop(log.unitId);
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
				ChargeBarDisplay.updateChargeBar(unit.id);
			}
		} catch (error) {
			logger.warn(
				"[CombatPlaybackController] Error updating charge bars, scene may be destroyed",
				error
			);
			playbackState.active = false;
		}
	};

	const updateFrame = (_state: State.State, _time: number, delta: number): void => {
		if (!playbackState.active) return;

		try {
			playbackState.currentTime += delta;

			updateChargeBars(delta);

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

	const finishCombat = async (
		state: State.State,
		outcome: RunCombatCore.WaveOutcome
	): Promise<void> => {
		if (!playbackState.active) return;

		playbackState.active = false;

		if (playbackState.countdownTimerState) {
			// no countdown stop action needed in playback
		}

		if (outcome === "player_lost") {
			const core = Card.getBattleCore(state)(CoreConstants.FORCE_ID_PLAYER);
			if (core) {
				await Animations.shatter(Chara.mustGetCharaById(core.id));
			}
		} else if (outcome === "player_won") {
			const core = Card.getBattleCore(state)(CoreConstants.FORCE_ID_CPU);
			if (core) {
				await Animations.shatter(Chara.mustGetCharaById(core.id));
			}
		}

		await animation.delay(300);

		if (playbackState.combatStates) {
			let forceStatsState = playbackState.combatStates.forceStatsState;
			forceStatsState = ForceStats.destroyForceStats(forceStatsState, CoreConstants.FORCE_ID_CPU);
			forceStatsState = ForceStats.syncPlayerPersistentForceStats(forceStatsState);
			CombatSystemStates.updateForceStatsState(forceStatsState);
		}

		// Reset visual state on the battleData player units
		state.battleData.units
			.filter((u) => u.force === CoreConstants.FORCE_ID_PLAYER)
			.forEach((u) => {
				Unit.resetUnitStats(u);
				ChargeBarDisplay.updateChargeBar(u.id);
			});

		if (onReplayEnd) {
			await onReplayEnd(outcome);
		}

		logger.debug("[CombatPlaybackController] Combat ended. Outcome:", outcome);
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
			logger: CombatLogger.createCombatLogger(),
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