import * as State from "@Models/State";
import * as RunCombatCore from "@Core/Combat/RunCombatCore";
import * as CombatLogger from "@Core/Combat/CombatLogger";
import * as BlackHoleState from "@Core/Combat/BlackHoleState";
import * as BlackHole from "@Screens/Battleground/Components/BlackHole/BlackHole";
import * as CountdownTimer from "@Systems/CountdownTimer";
import * as CombatSystemStates from "@Systems/CombatSystemStates";
import * as PoisonDamageSystem from "@Systems/PoisonDamageSystem";
import * as RegenSystem from "@Systems/RegenSystem";
import * as CombatStatsTracker from "@Systems/CombatStatsTracker";
import * as Logger from "@Utils/Logger";
import * as Animations from "@Systems/Chara/Animations";
import * as ChargeBarDisplay from "@Systems/Chara/ChargeBarDisplay";
import * as Chara from "@Systems/Chara/Chara";
import * as Unit from "@Models/Entities/Unit";
import * as CoreConstants from "@Core/Constants";
import * as Card from "@Models/Entities/Card";
import * as animation from "@Utils/animation";
import * as ScheduledEffects from "@Core/Combat/ScheduledEffects";
import * as logHandlers from "./logHandlers";

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

const DEFAULT_ANIMATION_DURATION = 400;

// TODO: this is bad
// Must match ServerConstants.MIN_COOLDOWN
const MIN_COOLDOWN = 200;

export const createCombatPlaybackController = (
	logs: CombatLogger.CombatLogEntry[],
	onReplayEnd?: (outcome: RunCombatCore.WaveOutcome) => void
): RunCombatCore.CombatRunner => {
	const { state } = window as unknown as { state: State.State };

	const combatStates: CombatSystemStates.CombatSystemStates = {
		poisonSystemState: PoisonDamageSystem.initializePoisonSystem(),
		regenSystemState: RegenSystem.initializeRegenSystem(),
		combatStatsTrackerState: CombatStatsTracker.initialize(state),
	};

	CombatSystemStates.setCombatSystemStates(combatStates);

	const playbackState: PlaybackState = {
		active: true,
		currentTime: 0,
		animations: [],
		outcome: null,
		combatStates,
		blackHoleState: BlackHole.initBlackHole(),
	};

	const scheduleAnimations = () => {
		logs.forEach((log) => {
			const startTime = log.timeMs;
			const duration = DEFAULT_ANIMATION_DURATION;
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
		if (!playbackState.active) return;

		const { log } = animation;

		if ("sourceId" in log && log.sourceId)
			Animations.pop(log.sourceId);

		logHandlers.executeLogHandler(log, playbackState);

		// storm_start is a special case handled inline since it accesses blackHoleState
		// TODO: the black hole does no need state, or expose it, because it can be driven by logs
		if (log.type === "storm_start") {
			if (playbackState.blackHoleState) {
				playbackState.blackHoleState = BlackHole.activateBlackHole(playbackState.blackHoleState);
			}
		}

		animation.executed = true;
	};

	const updateChargeBars = (delta: number) => {
		if (!playbackState.active) return;

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

	};

	const updateFrame = (_state: State.State, _time: number, delta: number): void => {
		if (!playbackState.active) return;

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

		// if (playbackState.combatStates) {
		// 	let forceStatsState = playbackState.combatStates.forceStatsState;
		// 	forceStatsState = ForceStats.destroyForceStats(forceStatsState, CoreConstants.FORCE_ID_CPU);
		// 	forceStatsState = ForceStats.syncPlayerPersistentForceStats(forceStatsState);
		// 	CombatSystemStates.updateForceStatsState(forceStatsState);
		// }

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

		Logger.debug("CombatPlaybackController", "[CombatPlaybackController] Combat ended. Outcome:", outcome);
	};

	const isActive = (): boolean => {
		return playbackState.active;
	};

	const stop = (): void => {
		Logger.debug("CombatPlaybackController", "[CombatPlaybackController] Stopping combat playback");
		playbackState.active = false;
	};

	const getEnv = () => {
		return {
			state,
			logger: CombatLogger.createCombatLogger(),
			scheduledEffects: ScheduledEffects.initialize(),
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