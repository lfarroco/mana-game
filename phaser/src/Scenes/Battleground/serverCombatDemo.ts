import { runCombat } from "./RunCombatCore.js";
import { createServerCombatEffects } from "./ServerCombatEffects.js";
import { State } from "@Models/State.js";
import { makeForce } from "@Models/Entities/Force.js";
import { makeUnit } from "@Models/Entities/Unit.js";
import { FORCE_ID_PLAYER, FORCE_ID_CPU } from "./ServerConstants.js";

const createMockState = (): State => {
	const playerForce = makeForce(FORCE_ID_PLAYER);
	const cpuForce = makeForce(FORCE_ID_CPU);

	const playerUnit = makeUnit(
		FORCE_ID_PLAYER,
		"mana_crystal",
		{ x: 1, y: 1 },
	);

	playerUnit.isCore = true;
	playerUnit.maxLife = 100;
	playerUnit.life = 100;

	const cpuUnit = makeUnit(
		FORCE_ID_CPU,
		"critical_crystal",
		{ x: 1, y: 1 }
	);
	cpuUnit.isCore = true;
	cpuUnit.maxLife = 100;
	cpuUnit.life = 100;

	return {
		savedGames: [],
		gameData: {
			round: 1,
			hour: 0,
			player: playerForce,
			recentEncounterIds: [],
			runStats: {
				damageDealt: 0,
				poisonDealt: 0,
				shieldDealt: 0,
				regenDealt: 0,
				healDealt: 0,
				mostPowerfulUnit: null,
				totalUnitsRecruited: 0,
				unitUsage: {},
			},
			seed: Date.now(),
			initialSeed: Date.now(),
			isSeeded: false,
		},
		battleData: {
			forces: [playerForce, cpuForce],
			grid: [[0, 0], [0, 0]],
			units: [playerUnit, cpuUnit],
		},
	};
};

const runServerSideCombat = () => {
	console.log("=== Server-Side Combat Demo ===\n");

	const state = createMockState();
	const effects = createServerCombatEffects();
	const combatRunner = runCombat(state, effects);

	console.log("Combat initialized");
	console.log(`Player units: ${state.battleData.units.filter(u => u.id.startsWith("player")).length}`);
	console.log(`CPU units: ${state.battleData.units.filter(u => u.id.startsWith("cpu")).length}\n`);

	let frame = 0;
	const deltaTime = 16.67;

	while (combatRunner.isActive() && frame < 1000) {
		combatRunner.updateFrame(state, frame * deltaTime, deltaTime);
		frame++;
	}

	console.log(`\nCombat ended after ${frame} frames`);
	console.log("This demonstrates that combat logic runs without browser dependencies!");
};

runServerSideCombat();
