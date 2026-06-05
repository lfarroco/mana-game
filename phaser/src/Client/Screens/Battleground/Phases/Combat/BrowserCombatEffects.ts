import * as State from "@Models/State";
import * as RunCombatCore from "@Core/Combat/RunCombatCore";
import type * as ForceStatsState from "@Core/Combat/ForceStatsState";
import type * as BlackHoleState from "@Core/Combat/BlackHoleState";
import * as Animations from "@Systems/Chara/Animations";
import * as ChargeBarDisplay from "@Systems/Chara/ChargeBarDisplay";
import * as Card from "@Models/Entities/Card";
import * as animation from "@Utils/animation";
import * as Chara from "@Systems/Chara/Chara";
import * as Unit from "@Models/Entities/Unit";

import * as ForceStats from "@Screens/Battleground/Components/ForceStats";
import * as BlackHole from "@Screens/Battleground/Components/BlackHole/BlackHole";
import * as CountdownTimer from "@Systems/CountdownTimer";
import * as damage from "@TriggerSystem/effects/visuals/damage";
import * as heal from "@TriggerSystem/effects/visuals/heal";
import * as shield from "@TriggerSystem/effects/visuals/shield";
import * as poison from "@TriggerSystem/effects/visuals/poison";
import * as Effects from "@Effects";

import * as AudioManager from "@Systems/AudioManager";
import * as Chara_1 from "@Systems/Chara/Chara";
import * as PowerDisplay from "@Systems/Chara/PowerDisplay";
import * as constants from "@Constants";
import * as CombatSystemStates from "@Systems/CombatSystemStates";
import * as Logger from "@Utils/Logger";

const logger = Logger.createLogger("BrowserCombatEffects");

// TODO: this should not be necessary
// When simulating combat in the backend, these can simply be skipped
// as there is nothing to replace it
export const createBrowserCombatEffects = (
	onReplayEnd?: () => void
): RunCombatCore.CombatEffects => {
	return {
		onUnitPop: (unitId: string) => {
			Animations.pop(unitId);
		},

		onChargeBarUpdate: (unitId: string) => {
			ChargeBarDisplay.updateChargeBar(unitId);
		},

		onCombatEnd: async (
			state: State.State,
			outcome: RunCombatCore.WaveOutcome,
			combatStates: CombatSystemStates.CombatSystemStates
		) => {
			if (outcome === "player_lost") {
				const core = Card.getBattleCore(state)(constants.FORCE_ID_PLAYER);
				if (core) {
					await Animations.shatter(Chara.mustGetCharaById(core.id));
				}
			} else if (outcome === "player_won") {
				const core = Card.getBattleCore(state)(constants.FORCE_ID_CPU);
				if (core) {
					await Animations.shatter(Chara.mustGetCharaById(core.id));
				}
			}

			await animation.delay(300);

			if (combatStates) {
				let forceStatsState = combatStates.forceStatsState;
				forceStatsState = ForceStats.destroyForceStats(forceStatsState, constants.FORCE_ID_CPU);
				forceStatsState = ForceStats.syncPlayerPersistentForceStats(forceStatsState);
				CombatSystemStates.updateForceStatsState(forceStatsState);
			}

			// Reset visual state on the battleData player units (charge bars reference these objects)
			state.battleData.units
				.filter((u) => u.force === constants.FORCE_ID_PLAYER)
				.forEach((u) => {
					Unit.resetUnitStats(u);
					ChargeBarDisplay.updateChargeBar(u.id);
				});

			if (onReplayEnd) {
				// After replay ends, show the results screen again
				await onReplayEnd();
			}
		},

		getTimeScale: () => {
			return io.scene.time.timeScale;
		},

		getScene: () => {
			return io.scene;
		},

		updateLifeDisplay: (
			force: string,
			life: number,
			delta: number,
			forceStatsState?: ForceStatsState.ForceStatsState
		) => {
			ForceStats.updateLifeDisplay(force, life, delta, forceStatsState);
		},

		updateShieldDisplay: (
			force: string,
			shield: number,
			delta: number,
			forceStatsState?: ForceStatsState.ForceStatsState
		) => {
			ForceStats.updateShieldDisplay(force, shield, delta, forceStatsState);
		},

		updateRegenDisplay: (force: string, regen: number, delta: number) => {
			ForceStats.updateRegenDisplay(force, regen, delta);
		},

		updatePoisonDisplay: (force: string, poison: number, delta: number) => {
			ForceStats.updatePoisonDisplay(force, poison, delta);
		},

		initBlackHole: () => {
			return BlackHole.initBlackHole();
		},

		initCountdownTimer: (blackHoleState: BlackHoleState.BlackHoleState | null) => {
			if (!blackHoleState) {
				return CountdownTimer.initializeCountdownTimer(io.scene, BlackHole.initBlackHole());
			}
			return CountdownTimer.initializeCountdownTimer(io.scene, blackHoleState);
		},

		startCountdownTimer: (timerState: CountdownTimer.CountdownTimerState) => {
			return CountdownTimer.start(timerState);
		},

		stopCountdownTimer: (timerState: CountdownTimer.CountdownTimerState) => {
			return CountdownTimer.stop(timerState);
		},

		initForceStats: () => {
			let state = CombatSystemStates.isInitialized()
				? CombatSystemStates.getCombatSystemStates().forceStatsState
				: ForceStats.initializeForceStatsState();
			state = ForceStats.ensureForceStats(state, constants.FORCE_ID_PLAYER);
			state = ForceStats.ensureForceStats(state, constants.FORCE_ID_CPU);
			return state;
		},

		onReactionVisual: async (unitId: string) => {
			const chara = Chara.mustGetCharaById(unitId);
			Effects.summonEffect(chara);
		},

		onDamage: (sourceId: string, targetId: string, _amount: number, onHit: () => void) => {
			AudioManager.playSoundEffect("sfx_spell_truestrike");
			damage.damageFx(Chara.mustGetCharaById(sourceId), Chara.mustGetCharaById(targetId), () => {
				onHit();
				Chara_1.shake(Chara.mustGetCharaById(targetId));
			});
		},

		onHeal: (sourceId: string, targetId: string, _amount: number, onHit: () => void) => {
			heal.healFx(Chara.mustGetCharaById(sourceId), Chara.mustGetCharaById(targetId), onHit);
		},

		onShield: (sourceId: string, targetId: string, _amount: number, onHit: () => void) => {
			AudioManager.playSoundEffect("sfx_spell_manavortex");
			shield.shieldFx(Chara.mustGetCharaById(sourceId), Chara.mustGetCharaById(targetId), onHit);
		},

		onPoison: (sourceId: string, targetId: string, _amount: number, onHit: () => void) => {
			poison.poisonFx(Chara.mustGetCharaById(sourceId), Chara.mustGetCharaById(targetId), onHit);
		},

		onRegen: (sourceId: string, targetId: string, _amount: number, onHit: () => void) => {
			AudioManager.playSoundEffect("sfx_spell_tranquility");

			Effects.arcaneMissileTargeted(Chara.mustGetCharaById(sourceId), Chara.mustGetCharaById(targetId), {
				colors: [0x00ff00, 0x32cd32, 0x7fff00, 0x00ff00], //dark green tones
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
				onHit,
			});
		},

		onHaste: (sourceId: string, targetId: string, _duration: number, onHit: () => void) => {
			const effect = async () => {
				onHit();
				Effects.hasteEffect(Chara.mustGetCharaById(targetId), {
					duration: 1000,
					intensity: 1.5,
					color: 0x00eaff,
				});
			};

			Effects.arcaneMissileTargeted(Chara.mustGetCharaById(sourceId), Chara.mustGetCharaById(targetId), {
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
		},

		onSlow: (sourceId: string, targetId: string, _duration: number, onHit: () => void) => {
			const effect = async () => {
				onHit();
				Effects.slowEffect(Chara.mustGetCharaById(targetId), {
					duration: 1000,
					intensity: 1.5,
					color: 0xd2691e,
				});
			};

			Effects.arcaneMissileTargeted(Chara.mustGetCharaById(sourceId), Chara.mustGetCharaById(targetId), {
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
		},

		onCharge: (sourceId: string, targetId: string, _amount: number, onHit: () => void) => {
			const effect = async () => {
				onHit();
				Effects.hasteEffect(Chara.mustGetCharaById(targetId), {
					duration: 1000,
					intensity: 1.5,
					color: 0xffd700,
				});
			};

			Effects.arcaneMissileTargeted(Chara.mustGetCharaById(sourceId), Chara.mustGetCharaById(targetId), {
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
		},

		onIncreasePower: (
			sourceId: string | undefined,
			targetId: string,
			_amount: number,
			_permanent: boolean,
			onHit: () => void
		) => {
			const effect = async () => {
				onHit();
				PowerDisplay.updatePowerDisplay(targetId);
			};

			if (!sourceId) {
				effect();
				return;
			}

			Effects.arcaneMissileTargeted(Chara.mustGetCharaById(sourceId), Chara.mustGetCharaById(targetId), {
				colors: [0xffa500, 0xff8c00, 0xff4500],
				amplitudeMin: 5,
				amplitudeMax: 15,
				particleScale: 1.5,
				impact: {
					colors: [0xffa500, 0xff8c00],
					scale: 2,
					speed: 200,
					lifespan: 300,
					alpha: 0.4,
				},
				onHit: effect,
			});
		},

		onDecreasePower: (
			sourceId: string | undefined,
			targetId: string,
			_amount: number,
			_permanent: boolean,
			onHit: () => void,
			_delayedExecution?: number,
			affectedUnitId?: string
		) => {
			const effect = async () => {
				onHit();
				PowerDisplay.updatePowerDisplay(affectedUnitId ?? targetId);
			};

			if (!sourceId) {
				effect();
				return;
			}

			Effects.arcaneMissileTargeted(Chara.mustGetCharaById(sourceId), Chara.mustGetCharaById(targetId), {
				colors: [0x8a2be2, 0x9400d3, 0x9932cc],
				impact: {
					colors: [0x8a2be2, 0x9400d3],
				},
				onHit: effect,
			});
		},

		onIncreaseCritical: (sourceId: string | undefined, targetId: string, onHit: () => void) => {
			const effect = async () => {
				onHit();
				// Note: Manual handling of critical popText might be needed here if updateUnitCritical was removed,
				// but for now we assume onHit updates data and we just play sound/projectiles.
				// Actually original code played innerfocus sound.
				AudioManager.playSoundEffect("sfx_spell_innerfocus");
			};

			if (!sourceId) {
				effect();
				return;
			}

			Effects.arcaneMissileTargeted(Chara.mustGetCharaById(sourceId), Chara.mustGetCharaById(targetId), {
				colors: [0xffa500, 0xff8c00, 0xff4500],
				amplitudeMin: 5,
				amplitudeMax: 15,
				particleScale: 1.5,
				impact: {
					colors: [0xffa500, 0xff8c00],
					scale: 2,
					speed: 200,
					lifespan: 300,
					alpha: 0.4,
				},
				onHit: effect,
			});
		},

		onPowerUpdate: (unitId: string) => {
			PowerDisplay.updatePowerDisplay(unitId);
		},

		onTimeoutDamageVisual: (targetForceId: string, _damage: number, onHit: () => void) => {
			const target = Card.getBattleCore(state)(targetForceId);

			if (!target) {
				logger.warn(
					`[BrowserCombatEffects] onTimeoutDamageVisual: No core found for force ${targetForceId}`
				);
				onHit();
				return;
			}

			const core = Chara.mustGetCharaById(target.id);
			const colors = [0x000000];

			AudioManager.playSoundEffect("sfx_voidhunter_attack_impact");

			Effects.arcaneMissileTargeted(constants.MIDDLE_SCREEN, core, {
				colors,
				blendMode: Phaser.BlendModes.NORMAL,
				onHit: () => {
					onHit();
					Chara_1.shake(core);
				},
			});
		},

		onTimeoutStart: () => {
			// Handled by playback controller in multiplayer or local logic
			// For strictly local single player, we might need a way to set blackHole visible here
			// if we want to support it. But for now, empty to satisfy interface.
		},
	};
};
