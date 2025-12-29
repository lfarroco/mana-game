import { State, getCurrentScene } from "@Models/State";
import { CombatEffects, WaveOutcome } from "./RunCombatCore";
import * as Animations from "@Systems/Chara/Animations";
import * as ChargeBarDisplay from "@Systems/Chara/ChargeBarDisplay";
import { getBattleCore } from "@Models/Entities/Card";
import { delay } from "@Utils/animation";
import { getCharaById } from "@Systems/Chara/Chara";
import { cpuForce, playerForce } from "@Models/Entities/Force";
import * as Systems from "./Systems";
import * as ForceStats from "./ForceStats";
import { initBlackHole } from "./BlackHole";
import * as CountdownTimer from "./Systems/CountdownTimer";
import { summonEffect } from "../../Effects/summonEffect";
import { damageFx } from "../../TriggerSystem/effects/visuals/damage";
import { healFx } from "../../TriggerSystem/effects/visuals/heal";
import { shieldFx } from "../../TriggerSystem/effects/visuals/shield";
import { poisonFx } from "../../TriggerSystem/effects/visuals/poison";
import { arcaneMissileTargeted } from "../../Effects/index";

import { playSoundEffect } from "@Systems/AudioManager";
import { shake } from "@Systems/Chara/Chara";
import { hasteEffect } from "../../Effects/hasteEffect";
import { slowEffect } from "../../Effects/slowEffect";
import * as PowerDisplay from "@Systems/Chara/PowerDisplay";
import { MIDDLE_SCREEN, FORCE_ID_PLAYER, FORCE_ID_CPU } from "@Constants/constants";
import { getState } from "@Models/State";
import { resetUnitStats } from "@Models/Entities/Unit";
import * as CombatSystemStates from "./Systems/CombatSystemStates";

export const createBrowserCombatEffects = (): CombatEffects => {
	return {
		onUnitPop: (unitId: string) => {
			Animations.pop(unitId);
		},

		onChargeBarUpdate: (unitId: string) => {
			ChargeBarDisplay.updateChargeBar(unitId);
		},

		onCombatEnd: async (state: State, outcome: WaveOutcome, combatStates: CombatSystemStates.CombatSystemStates) => {
			if (outcome === "player_lost") {
				const core = getBattleCore(state)(playerForce(state).id);
				if (core) {
					await Animations.shatter(getCharaById(core.id));
				}
			} else {
				const core = getBattleCore(state)(cpuForce(state).id);
				if (core) {
					await Animations.shatter(getCharaById(core.id));
				}
			}

			await delay(300);

			if (combatStates) {
				let forceStatsState = combatStates.forceStatsState;
				forceStatsState = ForceStats.destroyForceStats(forceStatsState, FORCE_ID_CPU);
				forceStatsState = ForceStats.destroyForceStats(forceStatsState, FORCE_ID_PLAYER);
				CombatSystemStates.updateForceStatsState(forceStatsState);
			}
			state.gameData.player.units.forEach(resetUnitStats);

			await Systems.ResultsPhase.handleCombatEnded(state, outcome);
		},

		getTimeScale: () => {
			return getCurrentScene().time.timeScale;
		},

		getScene: () => {
			return getCurrentScene();
		},

		updateLifeDisplay: (force: string, life: number, delta: number, forceStatsState?: any) => {
			ForceStats.updateLifeDisplay(force, life, delta, forceStatsState);
		},

		updateShieldDisplay: (force: string, shield: number, delta: number, forceStatsState?: any) => {
			ForceStats.updateShieldDisplay(force, shield, delta, forceStatsState);
		},

		updateRegenDisplay: (force: string, regen: number, delta: number) => {
			ForceStats.updateRegenDisplay(force, regen, delta);
		},

		updatePoisonDisplay: (force: string, poison: number, delta: number) => {
			ForceStats.updatePoisonDisplay(force, poison, delta);
		},

		initBlackHole: () => {
			return initBlackHole();
		},

		initCountdownTimer: (blackHoleState: any) => {
			return CountdownTimer.initializeCountdownTimer(getCurrentScene(), blackHoleState);
		},

		initForceStats: () => {
			let state = ForceStats.initializeForceStatsState();
			state = ForceStats.createForceStats(state, FORCE_ID_PLAYER);
			state = ForceStats.createForceStats(state, FORCE_ID_CPU);
			return state;
		},

		onReactionVisual: async (unitId: string) => {
			const chara = getCharaById(unitId);
			summonEffect(getCurrentScene(), chara);
		},

		onDamage: (sourceId: string, targetId: string, _amount: number, onHit: () => void) => {
			playSoundEffect('sfx_spell_truestrike');
			damageFx(
				getCharaById(sourceId),
				getCharaById(targetId),
				() => {
					onHit();
					shake(getCharaById(targetId));
				}
			);
		},

		onHeal: (sourceId: string, targetId: string, _amount: number, onHit: () => void) => {
			healFx(
				getCharaById(sourceId),
				getCharaById(targetId),
				onHit
			);
		},

		onShield: (sourceId: string, targetId: string, _amount: number, onHit: () => void) => {
			playSoundEffect('sfx_spell_manavortex');
			shieldFx(
				getCharaById(sourceId),
				getCharaById(targetId),
				onHit
			);
		},

		onPoison: (sourceId: string, targetId: string, _amount: number, onHit: () => void) => {
			poisonFx(
				getCharaById(sourceId),
				getCharaById(targetId),
				onHit
			);
		},

		onRegen: (sourceId: string, targetId: string, _amount: number, onHit: () => void) => {
			playSoundEffect('sfx_spell_tranquility');

			arcaneMissileTargeted(getCharaById(sourceId), getCharaById(targetId), {
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
				hasteEffect(getCharaById(targetId), {
					duration: 1000,
					intensity: 1.5,
					color: 0x00eaff,
				});
			};

			arcaneMissileTargeted(getCharaById(sourceId), getCharaById(targetId), {
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
				slowEffect(getCharaById(targetId), {
					duration: 1000,
					intensity: 1.5,
					color: 0xd2691e,
				});
			};

			arcaneMissileTargeted(getCharaById(sourceId), getCharaById(targetId), {
				colors: [0x6E260E, 0x7B3F00, 0x6F4E37],
				amplitudeMin: 5,
				amplitudeMax: 20,
				particleScale: 1.5,
				blendMode: Phaser.BlendModes.NORMAL,
				impact: {
					colors: [0x6E260E, 0x954535],
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
				hasteEffect(getCharaById(targetId), {
					duration: 1000,
					intensity: 1.5,
					color: 0xffd700,
				});
			};

			arcaneMissileTargeted(getCharaById(sourceId), getCharaById(targetId), {
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

		onIncreasePower: (sourceId: string | undefined, targetId: string, _amount: number, _permanent: boolean, onHit: () => void) => {
			const effect = async () => {
				onHit();
				PowerDisplay.updatePowerDisplay(targetId);
			};

			if (!sourceId) {
				effect();
				return;
			}

			arcaneMissileTargeted(getCharaById(sourceId), getCharaById(targetId), {
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

		onDecreasePower: (sourceId: string | undefined, targetId: string, _amount: number, _permanent: boolean, onHit: () => void) => {
			const effect = async () => {
				onHit();
				PowerDisplay.updatePowerDisplay(targetId);
			};

			if (!sourceId) {
				effect();
				return;
			}

			arcaneMissileTargeted(getCharaById(sourceId), getCharaById(targetId), {
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
				playSoundEffect("sfx_spell_innerfocus");
			};

			if (!sourceId) {
				effect();
				return;
			}

			arcaneMissileTargeted(getCharaById(sourceId), getCharaById(targetId), {
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
			const state = getState();
			const target = getBattleCore(state)(targetForceId);

			if (!target) {
				console.warn(`[BrowserCombatEffects] onTimeoutDamageVisual: No core found for force ${targetForceId}`);
				onHit();
				return;
			}

			const core = getCharaById(target.id);
			const colors = [0x000000];

			playSoundEffect('sfx_voidhunter_attack_impact');

			arcaneMissileTargeted(MIDDLE_SCREEN, core, {
				colors,
				blendMode: Phaser.BlendModes.NORMAL,
				onHit: () => {
					onHit();
					shake(core);
				},
			});
		},
	};
};
