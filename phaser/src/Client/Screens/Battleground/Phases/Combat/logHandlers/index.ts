import type { LogHandler } from "./types";
import {
	handleDamageCast,
	handleHealCast,
	handleShieldCast,
	handlePoisonCast,
	handleDamageHit,
	handleHealHit,
	handleShieldHit,
	handlePoisonHit,
	handlePoisonTick,
	handleRegenTick,
	handleTimeoutDamage,
} from "./projectileHandlers";
import {
	handleRegenCast,
	handleHasteCast,
	handleSlowCast,
	handleChargeCast,
	handleRegenHit,
	handleHasteHit,
	handleSlowHit,
	handleChargeHit,
} from "./arcaneMissileHandlers";
import {
	handleIncreasePower,
	handleDecreasePower,
} from "./powerHandlers";
import {
	handleHasteEnd,
	handleSlowEnd,
} from "./statusHandlers";
import { handleCombatStats } from "./combatStatsHandlers";

const emptyHandler: LogHandler = () => { };

const logHandlers: Record<string, LogHandler> = {
	damage_cast: handleDamageCast,
	damage_hit: handleDamageHit,
	heal_cast: handleHealCast,
	heal_hit: handleHealHit,
	shield_cast: handleShieldCast,
	shield_hit: handleShieldHit,
	poison_cast: handlePoisonCast,
	poison_hit: handlePoisonHit,
	regen_cast: handleRegenCast,
	regen_hit: handleRegenHit,
	haste_cast: handleHasteCast,
	haste_hit: handleHasteHit,
	slow_cast: handleSlowCast,
	slow_hit: handleSlowHit,
	charge_cast: handleChargeCast,
	charge_hit: handleChargeHit,
	increase_power: handleIncreasePower,
	decrease_power: handleDecreasePower,
	increase_critical: emptyHandler,
	timeout_damage: handleTimeoutDamage,
	reaction: emptyHandler,
	haste_end: handleHasteEnd,
	slow_end: handleSlowEnd,
	poison_tick: handlePoisonTick,
	regen_tick: handleRegenTick,
	combat_stats: handleCombatStats,
};

export const executeLogHandler: LogHandler = (log, playbackState) => {
	const handler = logHandlers[log.type];
	if (handler) {
		handler(log, playbackState);
	}
};

export type { LogHandler, PlaybackState } from "./types";
