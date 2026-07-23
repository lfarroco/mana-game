import * as CombatRunner from "@game/Combat/CombatRunner";
import * as CombatLogger from "@game/Combat/CombatLogger";
import * as BlackHole from "@Screens/Battleground/Components/BlackHole/BlackHole";
import * as CountdownTimer from "@Systems/CountdownTimer";
import * as PoisonDamageSystem from "@game/Combat/PoisonDamageSystem";
import * as RegenSystem from "@game/Combat/RegenSystem";
import * as CombatStatsTracker from "@game/Combat/CombatStatsTracker";
import * as Animations from "@Systems/Chara/Animations";
import * as ChargeBarDisplay from "@Systems/Chara/ChargeBarDisplay";
import * as Chara from "@Systems/Chara/Chara";
import * as CoreConstants from "@game/Constants";
import * as animation from "@Utils/animation";
import * as logHandlers from "./logHandlers";
import { CombatState, WaveOutcome, type CombatSystemStates } from "@game/Models";
import { BlackHoleState } from "./BlackHoleState";
import { resetUnitStats } from "@game/Entities/Unit";
import { env } from "@Env";

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
	outcome: WaveOutcome | null;
	combatStates: CombatSystemStates;
	blackHoleState?: BlackHoleState;
	countdownTimerState?: CountdownTimer.CountdownTimerState;
};

const DEFAULT_ANIMATION_DURATION = 400;

// Must match CoreConstants.MIN_COOLDOWN — used to replicate the server-side refresh lockout during playback
const MIN_COOLDOWN = CoreConstants.MIN_COOLDOWN;

export const createCombatPlaybackController = (
	logs: CombatLogger.CombatLogEntry[],
	onReplayEnd?: (outcome: WaveOutcome) => void
): CombatRunner.CombatRunner => {

	logHandlers.setCombatState(env.state.combatState!);

	const combatStates: CombatSystemStates = {
		poisonSystemState: PoisonDamageSystem.initializePoisonSystem(),
		regenSystemState: RegenSystem.initializeRegenSystem(),
		combatStatsTrackerState: CombatStatsTracker.initialize(env.state.combatState!),
	};

	const blackHoleState = BlackHole.initBlackHole();
	const countdownTimerState = CountdownTimer.initializeCountdownTimer(env.scene, blackHoleState);
	CountdownTimer.start(countdownTimerState);

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
		// TODO: black hole visual state could be driven entirely by combat logs
		// (storm_start / storm_end entries) rather than maintaining a separate state object.
		if (log.type === "storm_start") {
			if (playbackState.blackHoleState) {
				playbackState.blackHoleState = BlackHole.activateBlackHole(playbackState.blackHoleState);
			}
		}

		animation.executed = true;
	};

	const updateChargeBars = (delta: number) => {
		if (!playbackState.active) return;

		const units = env.state.combatState?.units;
		if (!units) return;

		for (const unit of units) {
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

	const updateFrame = (_combatState: CombatState, _time: number, delta: number): void => {
		if (!playbackState.active) return;

		const speed = env.state.settings.speed;
		const scaledDelta = delta * speed;

		playbackState.currentTime += scaledDelta;

		if (playbackState.countdownTimerState) {
			CountdownTimer.updateFromDelta(playbackState.countdownTimerState, scaledDelta);
		}

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
			finishCombat(playbackState.outcome);
		}

	};

	const finishCombat = async (
		outcome: WaveOutcome
	): Promise<void> => {
		if (!playbackState.active) return;

		playbackState.active = false;

		if (playbackState.countdownTimerState) {
			playbackState.countdownTimerState = CountdownTimer.stop(playbackState.countdownTimerState);
		}

		if (outcome === "player_lost") {
			await Animations.shatter(Chara.mustGetCharaById(env.state.combatState!.playerCore.id));
		} else if (outcome === "player_won") {
			await Animations.shatter(Chara.mustGetCharaById(env.state.combatState!.cpuCore.id));
		}

		await animation.delay(300);

		// Reset visual state on the combatState player units
		env.state.combatState!.units
			.filter((u) => u.force === CoreConstants.FORCE_ID_PLAYER)
			.forEach((u) => {
				resetUnitStats(u);
				ChargeBarDisplay.updateChargeBar(u.id);
			});

		if (onReplayEnd) {
			await onReplayEnd(outcome);
		}

		console.debug("CombatPlaybackController", "[CombatPlaybackController] Combat ended. Outcome:", outcome);
	};

	const isActive = (): boolean => {
		return playbackState.active;
	};

	const stop = (): void => {
		console.debug("CombatPlaybackController", "[CombatPlaybackController] Stopping combat playback");
		playbackState.active = false;
	};

	const getEnv = () => {
		return {
			seed: env.state.session.seed,
			combatState: env.state.combatState!,
			logger: CombatLogger.createCombatLogger(),
			deferredEvents: [],
			combatStates: playbackState.combatStates,
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