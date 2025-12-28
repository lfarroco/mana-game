import { runCombat } from "./RunCombatCore.js";
import { createServerCombatEffects } from "./ServerCombatEffects.js";
import { createMockState } from "../../test-utils/serverCombatUtils";
import { FORCE_ID_PLAYER, FORCE_ID_CPU } from "./ServerConstants.js";
import { registerCollection } from "@Models/Entities/Card.js";
import { BASE_COLLECTION_DATA } from "../../Data/BaseCollection.js";

// Register base collection to ensure unit definitions exist
registerCollection(BASE_COLLECTION_DATA);

export const runServerSideCombat = () => {
	console.log("=== Server-Side Combat Demo ===\n");

	const state = createMockState();
	const effects = createServerCombatEffects(state);
	const combatRunner = runCombat(state, effects);

	console.log("Combat initialized");
	console.log(`Player units: ${state.battleData.units.filter(u => u.force === FORCE_ID_PLAYER).length}`);
	console.log(`CPU units: ${state.battleData.units.filter(u => u.force === FORCE_ID_CPU).length}\n`);

	let frame = 0;
	// Use a fixed delta time for consistent results
	const deltaTime = 10; // or 16.67
	// Loop until combat ends or safety limit reached
	const SAFETY_MAX_FRAMES = 10000; //
	while (combatRunner.isActive() && frame < SAFETY_MAX_FRAMES) {
		effects.setFrame(frame);
		combatRunner.updateFrame(state, frame * deltaTime, deltaTime);
		frame++;
	}

	console.log(`\nCombat ended after ${frame} frames`);

	const outcomeLog = effects.logs.find(l => l.type === "outcome");
	const result = outcomeLog && outcomeLog.type === "outcome" ? outcomeLog.result : "Draw / Timeout"; // Type guard check strictly speaking not needed if find works but helps TS
	console.log(`Result: ${result}`);

	console.log("\n=== Combat Logs ===");
	effects.logs.forEach(log => {
		const prefix = `[${log.frame}]`;
		if (log.type === "reaction") {
			console.log(`${prefix} [REACT] ${log.unitId} reacted`);
		} else if (log.type === "damage") {
			console.log(`${prefix} [DMG] ${log.sourceId} dealt ${log.amount} damage to ${log.targetId} (${log.duration}ms)`);
		} else if (log.type === "heal") {
			console.log(`${prefix} [HEAL] ${log.sourceId} healed ${log.targetId} for ${log.amount} (${log.duration}ms)`);
		} else if (log.type === "shield") {
			console.log(`${prefix} [SHIELD] ${log.sourceId} shielded ${log.targetId} for ${log.amount} (${log.duration}ms)`);
		} else if (log.type === "poison") {
			console.log(`${prefix} [POISON] ${log.sourceId} poisoned ${log.targetId} for ${log.amount}/tick (${log.duration}ms)`);
		} else if (log.type === "regen") {
			console.log(`${prefix} [REGEN] ${log.sourceId} applied ${log.amount}/tick regen to ${log.targetId} (${log.duration}ms)`);
		} else if (log.type === "crystal_life") {
			console.log(`${prefix} [CRYSTAL] ${log.force} crystal life: ${log.life}`);
		} else if (log.type === "timeout_damage") {
			console.log(`${prefix} [TIMEOUT] Timeout damage: ${log.damage} to ${log.force} (${log.duration}ms)`);
		} else if (log.type === "haste") {
			console.log(`${prefix} [HASTE] ${log.sourceId} applied haste to ${log.targetId} (effect: ${log.effectDuration}ms, travel: ${log.duration}ms)`);
		} else if (log.type === "slow") {
			console.log(`${prefix} [SLOW] ${log.sourceId} applied slow to ${log.targetId} (effect: ${log.effectDuration}ms, travel: ${log.duration}ms)`);
		} else if (log.type === "charge") {
			console.log(`${prefix} [CHARGE] ${log.sourceId} charged ${log.targetId} by ${log.amount} (${log.duration}ms)`);
		} else if (log.type === "increase_power") {
			console.log(`${prefix} [PWR+] ${log.sourceId || 'system'} increased power of ${log.targetId} (${log.duration}ms)`);
		} else if (log.type === "decrease_power") {
			console.log(`${prefix} [PWR-] ${log.sourceId || 'system'} decreased power of ${log.targetId} (${log.duration}ms)`);
		} else if (log.type === "increase_critical") {
			console.log(`${prefix} [CRIT+] ${log.sourceId || 'system'} increased critical of ${log.targetId} (${log.duration}ms)`);
		} else if (log.type === "outcome") {
			console.log(`${prefix} [END] Winner: ${log.result}`);
		}
	});

	return {
		success: true,
		frames: frame,
		logs: effects.logs
	}
};

// Auto-run if executed directly
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	runServerSideCombat();
}
