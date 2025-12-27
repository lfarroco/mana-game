
import { State } from "@Models/State";
import { makeForce } from "@Models/Entities/Force";
import { makeUnit } from "@Models/Entities/Unit";
import { FORCE_ID_PLAYER, FORCE_ID_CPU } from "../Scenes/Battleground/ServerConstants";

export const createMockState = (): State => {
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
