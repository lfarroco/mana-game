import * as Models from "@Core/Models";
import * as Force from "@Models/Entities/Force";
import * as Unit from "@Models/Entities/Unit";
import * as Random from "@Utils/Random";
import * as Seeding from "@Core/Seeding";
import * as Geometry from "@Models/Geometry";

export type State = {
	savedGames: string[];
	session: Models.SessionData;
	battleData: {
		forces: Force.Force[];
		grid: number[][];
		units: Unit.Unit[];
	};
};

export const initialState = (): State => {
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
export const setState = (newState: State): void => {
	for (const key in state) {
		(state as Record<string, unknown>)[key] = (newState as Record<string, unknown>)[key];
	}
	Random.setSeed(Seeding.stringToSeed(newState.session.seed));
};

export const getState = (): State => state;

export const getUnitAt = (units: Unit.Unit[]) => (position: Vec2) =>
	units.find((u) => Geometry.eqVec2(u.position, position));
