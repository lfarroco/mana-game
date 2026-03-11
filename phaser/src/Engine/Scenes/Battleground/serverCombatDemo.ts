import { runCombat } from "./RunCombatCore";
import { createServerCombatEffects } from "./ServerCombatEffects";
import { createMockState } from "../../../test-utils/serverCombatUtils";
import { FORCE_ID_PLAYER, FORCE_ID_CPU } from "./ServerConstants";
import { registerCollection } from "@Models/Entities/Card";
import { BASE_COLLECTION_DATA } from "@Data/BaseCollection";
import { State } from "@Models/State";
import { createLogger } from "@Utils/Logger";

// Register base collection to ensure unit definitions exist
registerCollection(BASE_COLLECTION_DATA);
const logger = createLogger("ServerCombatDemo");

export const runServerSideCombat = (inputState?: State) => {
	logger.info("Starting server-side combat demo");

	const state = inputState || createMockState();
	const effects = createServerCombatEffects(state);
	const combatRunner = runCombat(state, effects);

	logger.info("Combat initialized", {
		playerUnits: state.battleData.units.filter((u: any) => u.force === FORCE_ID_PLAYER).length,
		cpuUnits: state.battleData.units.filter((u: any) => u.force === FORCE_ID_CPU).length,
	});

	let frame = 0;
	const deltaTime = 16.67;
	const SAFETY_MAX_FRAMES = 10000;
	while (combatRunner.isActive() && frame < SAFETY_MAX_FRAMES) {
		effects.setFrame(frame);
		combatRunner.updateFrame(state, frame * deltaTime, deltaTime);
		frame++;
	}

	logger.info("Combat ended", { frames: frame });

	const outcomeLog = effects.logs.find((l) => l.type === "outcome");
	const result = outcomeLog && outcomeLog.type === "outcome" ? outcomeLog.result : "Draw / Timeout";
	logger.info("Combat result", { result });

	if (!inputState) {
		logger.info("Printing combat logs");
		effects.logs.forEach((log) => {
			const prefix = `[${log.frame}]`;
			if (log.type === "reaction") {
				logger.info(`${prefix} [REACT] ${log.unitId} reacted`);
			} else if (log.type === "damage") {
				logger.info(
					`${prefix} [DMG] ${log.sourceId} dealt ${log.amount} damage to ${log.targetId} (${log.duration}ms)`
				);
			} else if (log.type === "heal") {
				logger.info(
					`${prefix} [HEAL] ${log.sourceId} healed ${log.targetId} for ${log.amount} (${log.duration}ms)`
				);
			} else if (log.type === "shield") {
				logger.info(
					`${prefix} [SHIELD] ${log.sourceId} shielded ${log.targetId} for ${log.amount} (${log.duration}ms)`
				);
			} else if (log.type === "poison") {
				logger.info(
					`${prefix} [POISON] ${log.sourceId} poisoned ${log.targetId} for ${log.amount}/tick (${log.duration}ms)`
				);
			} else if (log.type === "regen") {
				logger.info(
					`${prefix} [REGEN] ${log.sourceId} applied ${log.amount}/tick regen to ${log.targetId} (${log.duration}ms)`
				);
			} else if (log.type === "crystal_life") {
				logger.info(`${prefix} [CRYSTAL] ${log.force} crystal life: ${log.life}`);
			} else if (log.type === "timeout_damage") {
				logger.info(
					`${prefix} [TIMEOUT] Timeout damage: ${log.damage} to ${log.force} (${log.duration}ms)`
				);
			} else if (log.type === "haste") {
				logger.info(
					`${prefix} [HASTE] ${log.sourceId} applied haste to ${log.targetId} (effect: ${log.effectDuration}ms, travel: ${log.duration}ms)`
				);
			} else if (log.type === "slow") {
				logger.info(
					`${prefix} [SLOW] ${log.sourceId} applied slow to ${log.targetId} (effect: ${log.effectDuration}ms, travel: ${log.duration}ms)`
				);
			} else if (log.type === "charge") {
				logger.info(
					`${prefix} [CHARGE] ${log.sourceId} charged ${log.targetId} by ${log.amount} (${log.duration}ms)`
				);
			} else if (log.type === "increase_power") {
				logger.info(
					`${prefix} [PWR+] ${log.sourceId || "system"} increased power of ${log.targetId} (${log.duration}ms)`
				);
			} else if (log.type === "decrease_power") {
				logger.info(
					`${prefix} [PWR-] ${log.sourceId || "system"} decreased power of ${log.targetId} (${log.duration}ms)`
				);
			} else if (log.type === "increase_critical") {
				logger.info(
					`${prefix} [CRIT+] ${log.sourceId || "system"} increased critical of ${log.targetId} (${log.duration}ms)`
				);
			} else if (log.type === "outcome") {
				logger.info(`${prefix} [END] Winner: ${log.result}`);
			}
		});
	}

	return {
		success: true,
		frames: frame,
		logs: effects.logs,
		outcome: result,
	};
};
