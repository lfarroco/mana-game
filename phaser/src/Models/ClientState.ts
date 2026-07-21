import * as Models from "@game/Models";
import * as Geometry from "@game/Geometry";

export type ClientState = {
	savedGames: string[];
	session: Models.SessionData;
	combatState?: Models.CombatState;
};

export const initialState = (): ClientState => {
	const initialSeed = Date.now().toString();
	return {
		savedGames: [],
		session: {
			id: "default_local_session",
			player_id: "local_player",
			phase: "encounter",
			session_type: { type: "singleplayer" },
			round: 1,
			step: 0,
			seed: initialSeed,
			initial_seed: initialSeed,
			options: [],
			team: { units: [] },
			wins: 0,
			losses: 0,
			action_log: [],
			encounter_history: [],
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
	};
};

export const getUnitAt = (units: Models.Unit[]) => (position: Vec2) =>
	units.find((u) => Geometry.eqVec2(u.position, position));
