
import { State } from "@Models/State";
import { makeForce } from "@Models/Entities/Force";
import { makeUnit } from "@Models/Entities/Unit";
import { FORCE_ID_PLAYER, FORCE_ID_CPU } from "Client/Screens/Battleground/ServerConstants";

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
		session: {
			id: 'test_session',
			player_id: playerForce.id,
			phase: 'combat',
			round: 1,
			step: 0,
			seed: Date.now().toString(),
			initial_seed: Date.now().toString(),
			current_options: null,
			team: { units: [] },
			wins: 0,
			losses: 0,
			action_log: [],
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
		},
		battleData: {
			forces: [playerForce, cpuForce],
			grid: [[0, 0], [0, 0]],
			units: [playerUnit, cpuUnit],
		},
	};
};
