import * as CombatRunner from "@game/Combat/CombatRunner";
import * as CombatLogger from "@game/Combat/CombatLogger";
import { schedulePlayback, type ScheduledAnimation } from "@game/Combat/playbackScheduler";
import * as BlackHole from "@Screens/Battleground/Components/BlackHole/BlackHole";
import * as CountdownTimer from "@Screens/Battleground/Phases/Combat/CountdownTimer";
import * as PoisonDamageSystem from "@game/Combat/PoisonDamageSystem";
import * as RegenSystem from "@game/Combat/RegenSystem";
import * as CombatStatsTracker from "@game/Combat/CombatStatsTracker";
import * as Animations from "@Components/Chara/Animations";
import * as ChargeBarDisplay from "@Components/Chara/ChargeBarDisplay";
import * as Chara from "@Components/Chara/Chara";
import * as CoreConstants from "@game/Constants";
import * as animation from "@Utils/animation";
import * as logHandlers from "./logHandlers";
import { CombatState, WaveOutcome, type CombatSystemStates } from "@game/Models";
import { BlackHoleState } from "./BlackHoleState";
import { resetUnitStats } from "@game/Entities/Unit";
import { env } from "@Env";
import { BattlegroundEvent } from "../../../../Events";

type PlaybackState = {
	active: boolean;
	currentTime: number;
	animations: ScheduledAnimation[];
	nextAnimationIndex: number;
	executedCount: number;
	maxEndTime: number;
	outcome: WaveOutcome | null;
	combatStates: CombatSystemStates;
	blackHoleState?: BlackHoleState;
	countdownTimerState?: CountdownTimer.CountdownTimerState;
};

// Must match CoreConstants.MIN_REFRESH_MS — used to replicate the server-side refresh lockout during playback
const MIN_REFRESH_MS = CoreConstants.MIN_REFRESH_MS;

/**
 * FX rate cap — the maximum number of combat-log animations (and therefore FX
 * calls) executed in a single frame, tiered by the player's particle-quality
 * setting (docs/combat-playback-performance.md Optimization 1).
 *
 * Combat logs are bounded server-side (CombatRunner's runaway guard caps total
 * work/logs), but a legitimately extreme log can still cluster tens of
 * thousands of entries at a few timestamps (e.g. a charge-engine board). With
 * no cap, one game tick would execute them all at once — spawning thousands of
 * projectile/status FX in a single frame and spiking the CPU. The cap defers
 * overflow to subsequent frames (their startTime has already passed, so they
 * simply execute late), keeping FX calls per second bounded and smoothing
 * normal clustered bursts, while the playback timeline stays complete. At
 * 60 fps the default (medium) tier allows up to 60×10 = 600 FX calls/s; normal
 * combats produce a few hundred FX total.
 */
const MAX_ANIMATIONS_PER_FRAME: Record<"low" | "medium" | "high", number> = {
	low: 5,
	medium: 10,
	high: 15,
};

export const createCombatPlaybackController = (
	logs: CombatLogger.CombatLogEntry[]
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
		nextAnimationIndex: 0,
		executedCount: 0,
		maxEndTime: 0,
		outcome: null,
		combatStates,
		blackHoleState,
		countdownTimerState,
	};

	const scheduleAnimations = () => {
		const { animations, maxEndTime, outcome } = schedulePlayback(logs);
		playbackState.animations = animations;
		playbackState.maxEndTime = maxEndTime;
		playbackState.outcome = outcome;
	};

	const executeAnimation = (animation: ScheduledAnimation) => {
		if (!playbackState.active) return;

		const { log } = animation;

		if ("sourceId" in log && log.sourceId) Animations.pop(log.sourceId);

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
		playbackState.executedCount++;
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
				unit.refresh = MIN_REFRESH_MS;
			}

			unit.refresh = Math.max(0, unit.refresh - delta);
		}

		// Update visual charge bars every frame so the cooldown bar animates smoothly
		for (const unit of units) {
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

		// Use sorted pointer instead of O(n) filter every frame.
		// Animations are sorted by startTime, so we just advance the index
		// while the next one's startTime has been reached. The per-frame cap
		// (see MAX_ANIMATIONS_PER_FRAME) bounds FX calls per tick — overflow
		// stays "due" and executes on the next frames.
		const { animations, currentTime } = playbackState;
		const fxCap =
			MAX_ANIMATIONS_PER_FRAME[env.state.settings.particles] ?? MAX_ANIMATIONS_PER_FRAME.medium;
		let executedThisFrame = 0;
		while (
			playbackState.nextAnimationIndex < animations.length &&
			animations[playbackState.nextAnimationIndex].startTime <= currentTime &&
			executedThisFrame < fxCap
		) {
			const anim = animations[playbackState.nextAnimationIndex];
			if (!anim.executed) {
				executeAnimation(anim);
				executedThisFrame++;
			}
			playbackState.nextAnimationIndex++;
		}

		// O(1) completion check: counter instead of .every(), cached maxEndTime instead of Math.max(...map())
		if (
			playbackState.executedCount >= animations.length &&
			currentTime >= playbackState.maxEndTime &&
			playbackState.outcome
		) {
			finishCombat(playbackState.outcome);
		}
	};

	const finishCombat = async (outcome: WaveOutcome): Promise<void> => {
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
		env.state
			.combatState!.units.filter((u) => u.force === CoreConstants.FORCE_ID_PLAYER)
			.forEach((u) => {
				resetUnitStats(u);
				ChargeBarDisplay.updateChargeBar(u.id);
			});

		await BattlegroundEvent.combatPlaybackFinished.emit({
			outcome,
		});

		console.debug(
			"CombatPlaybackController",
			"[CombatPlaybackController] Combat ended. Outcome:",
			outcome
		);
	};

	const isActive = (): boolean => {
		return playbackState.active;
	};

	const stop = (): void => {
		console.debug(
			"CombatPlaybackController",
			"[CombatPlaybackController] Stopping combat playback"
		);
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
