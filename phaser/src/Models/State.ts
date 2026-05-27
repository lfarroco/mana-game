import { SessionData } from "@Core/Types";
import { Force } from "@Models/Entities/Force";
import { eqVec2 } from "@Models/ServerGeometry";
import { Unit } from "@Models/Entities/Unit";
import { setSeed } from "@Utils/Random";
import { stringToSeed } from "@Core/Seeding";

export type State = {
	savedGames: string[];
	session: SessionData;
	battleData: {
		forces: Force[];
		grid: number[][];
		units: Unit[];
	};
};

const initialState = (): State => {
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
			current_options: [],
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

const state = initialState();
declare global {
	var state: State;
}
if (typeof window !== "undefined") {
	window.state = state;
}

export function resetState() {
	const newState = initialState();

	setState(newState);

	setSeed(stringToSeed(state.session.seed));
}


/**
 * Update the global game state
 * Used primarily for testing and scene transitions
 */
export const setState = (newState: State): void => {
	for (const key in state) {
		(state as Record<string, unknown>)[key] = (newState as Record<string, unknown>)[key];
	}
	setSeed(stringToSeed(newState.session.seed));
};

export const getState = (): State => state;

export const getUnitAt = (units: Unit[]) => (position: Vec2) => {
	return units.find((u) => eqVec2(u.position, position));
};
