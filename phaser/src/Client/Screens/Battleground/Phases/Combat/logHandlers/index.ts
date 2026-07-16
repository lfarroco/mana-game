import type { LogHandler } from "./types";
import {
	handleDamage,
	handleHeal,
	handleShield,
	handlePoison,
} from "./projectileHandlers";
import {
	handleRegen,
	handleHaste,
	handleSlow,
	handleCharge,
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
	damage: handleDamage,
	heal: handleHeal,
	shield: handleShield,
	poison: handlePoison,
	regen: handleRegen,
	haste: handleHaste,
	slow: handleSlow,
	charge: handleCharge,
	increase_power: handleIncreasePower,
	decrease_power: handleDecreasePower,
	increase_critical: emptyHandler,
	timeout_damage: emptyHandler,
	reaction: emptyHandler,
	haste_end: handleHasteEnd,
	slow_end: handleSlowEnd,
	combat_stats: handleCombatStats,
};

export const executeLogHandler: LogHandler = (log, playbackState) => {
	const handler = logHandlers[log.type];
	if (handler) {
		handler(log, playbackState);
	}
};

export type { LogHandler, PlaybackState } from "./types";
