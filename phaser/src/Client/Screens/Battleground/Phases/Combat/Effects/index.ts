import * as RunCombatCore from "@Core/Combat/RunCombatCore";
import { createUnitPopEffect, createChargeBarUpdateEffect, createCombatEndEffect } from "./unitEffects";
import { createGetTimeScaleEffect, createGetSceneEffect } from "./timeEffects";
import {
	createUpdateLifeDisplayEffect,
	createUpdateShieldDisplayEffect,
	createUpdateRegenDisplayEffect,
	createUpdatePoisonDisplayEffect,
	createInitForceStatsEffect,
} from "./forceStatsEffects";
import {
	createInitBlackHoleEffect,
	createInitCountdownTimerEffect,
	createStartCountdownTimerEffect,
	createStopCountdownTimerEffect,
} from "./blackHoleEffects";
import { createReactionVisualEffect } from "./reactionEffects";
import { createDamageEffect, createHealEffect, createShieldEffect, createPoisonEffect } from "./projectileEffects";
import { createRegenEffect, createHasteEffect, createSlowEffect, createChargeEffect } from "./statusEffects";
import { createIncreasePowerEffect, createDecreasePowerEffect, createPowerUpdateEffect } from "./powerEffects";
import { createIncreaseCriticalEffect } from "./criticalEffects";
import { createTimeoutDamageVisualEffect, createTimeoutStartEffect } from "./timeoutEffects";

export const createCombatEffects = (
	onReplayEnd?: () => void
): RunCombatCore.CombatEffects => {
	return {
		onUnitPop: createUnitPopEffect(),
		onChargeBarUpdate: createChargeBarUpdateEffect(),
		onCombatEnd: createCombatEndEffect(onReplayEnd),
		getTimeScale: createGetTimeScaleEffect(),
		getScene: createGetSceneEffect(),
		updateLifeDisplay: createUpdateLifeDisplayEffect(),
		updateShieldDisplay: createUpdateShieldDisplayEffect(),
		updateRegenDisplay: createUpdateRegenDisplayEffect(),
		updatePoisonDisplay: createUpdatePoisonDisplayEffect(),
		initBlackHole: createInitBlackHoleEffect(),
		initCountdownTimer: createInitCountdownTimerEffect(),
		startCountdownTimer: createStartCountdownTimerEffect(),
		stopCountdownTimer: createStopCountdownTimerEffect(),
		initForceStats: createInitForceStatsEffect(),
		onReactionVisual: createReactionVisualEffect(),
		onDamage: createDamageEffect(),
		onHeal: createHealEffect(),
		onShield: createShieldEffect(),
		onPoison: createPoisonEffect(),
		onRegen: createRegenEffect(),
		onHaste: createHasteEffect(),
		onSlow: createSlowEffect(),
		onCharge: createChargeEffect(),
		onIncreasePower: createIncreasePowerEffect(),
		onDecreasePower: createDecreasePowerEffect(),
		onPowerUpdate: createPowerUpdateEffect(),
		onIncreaseCritical: createIncreaseCriticalEffect(),
		onTimeoutDamageVisual: createTimeoutDamageVisualEffect(window.state),
		onTimeoutStart: createTimeoutStartEffect(),
	};
};