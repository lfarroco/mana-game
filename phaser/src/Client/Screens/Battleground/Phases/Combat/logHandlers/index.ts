import type { PlaybackState } from "./types";
import * as CombatLogger from "@Core/Combat/CombatLogger";
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
	handleTimeoutDamageCast,
	handleTimeoutDamageHit,
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

export const executeLogHandler = (log: CombatLogger.CombatLogEntry, playbackState: PlaybackState): void => {
	switch (log.type) {
		case "damage_cast":
			handleDamageCast(log, playbackState);
			break;
		case "damage_hit":
			handleDamageHit(log, playbackState);
			break;
		case "heal_cast":
			handleHealCast(log, playbackState);
			break;
		case "heal_hit":
			handleHealHit(log, playbackState);
			break;
		case "shield_cast":
			handleShieldCast(log, playbackState);
			break;
		case "shield_hit":
			handleShieldHit(log, playbackState);
			break;
		case "poison_cast":
			handlePoisonCast(log, playbackState);
			break;
		case "poison_hit":
			handlePoisonHit(log, playbackState);
			break;
		case "regen_cast":
			handleRegenCast(log, playbackState);
			break;
		case "regen_hit":
			handleRegenHit(log, playbackState);
			break;
		case "haste_cast":
			handleHasteCast(log, playbackState);
			break;
		case "haste_hit":
			handleHasteHit(log, playbackState);
			break;
		case "slow_cast":
			handleSlowCast(log, playbackState);
			break;
		case "slow_hit":
			handleSlowHit(log, playbackState);
			break;
		case "charge_cast":
			handleChargeCast(log, playbackState);
			break;
		case "charge_hit":
			handleChargeHit(log, playbackState);
			break;
		case "increase_power":
			handleIncreasePower(log, playbackState);
			break;
		case "decrease_power":
			handleDecreasePower(log, playbackState);
			break;
		case "increase_critical":
			// no-op
			break;
		case "timeout_damage_cast":
			handleTimeoutDamageCast(log, playbackState);
			break;
		case "timeout_damage_hit":
			handleTimeoutDamageHit(log, playbackState);
			break;
		case "reaction":
			// no-op
			break;
		case "haste_end":
			handleHasteEnd(log, playbackState);
			break;
		case "slow_end":
			handleSlowEnd(log, playbackState);
			break;
		case "poison_tick":
			handlePoisonTick(log, playbackState);
			break;
		case "regen_tick":
			handleRegenTick(log, playbackState);
			break;
		case "combat_stats":
			handleCombatStats(log, playbackState);
			break;
		// outcome and storm_start are handled inline in CombatPlaybackController
		case "outcome":
		case "storm_start":
		default:
			break;
	}
};

export type { PlaybackState } from "./types";
