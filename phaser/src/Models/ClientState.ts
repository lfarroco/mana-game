import * as Models from "@game/Models";
import * as Force from "@game/Entities/Force";
import * as Random from "@game/Random";
import * as Seeding from "@game/Seeding";
import * as Geometry from "@game/Geometry";

export type ClientState = {
	savedGames: string[];
	session: Models.SessionData;
	combatState?: Models.CombatState;
	battleData: {
		forces: Force.Force[];
		grid: number[][];
		units: Models.Unit[];
	};
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
		battleData: {
			forces: [],
			grid: [],
			units: [],
		},
	};
};

export function resetState() {
	const newState = initialState();

	setState(newState);

	Random.setSeed(Seeding.stringToSeed(state.session.seed));
}

/**
 * Update the global game state
 * Used primarily for testing and scene transitions
 */
export const setState = (newState: ClientState): void => {
	for (const key in state) {
		(state as Record<string, unknown>)[key] = (newState as Record<string, unknown>)[key];
	}
	Random.setSeed(Seeding.stringToSeed(newState.session.seed));
};

export const getState = (): ClientState => state;

export const getUnitAt = (units: Models.Unit[]) => (position: Vec2) =>
	units.find((u) => Geometry.eqVec2(u.position, position));
