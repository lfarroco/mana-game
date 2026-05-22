import { Force } from "@Models/Entities/Force";
import { eqVec2 } from "@Models/ServerGeometry";
import { Unit } from "@Models/Entities/Unit";
import { setSeed } from "@Utils/Random";
import { SessionData } from "@Core/Types";
import { stringToSeed } from "@Core/Seeding";
import Core from "Client/Scenes/Core/Core";

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
			id: "local_session",
			player_id: "local_player",
			phase: "encounter",
			round: 1,
			step: 0,
			seed: initialSeed,
			initial_seed: initialSeed,
			current_options: null,
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

const state: {
	currentState: State;
} = {} as { currentState: State };

export const initState = () => {
	state.currentState = initialState();
};

export function resetState() {
	state.currentState = initialState();
	setSeed(stringToSeed(state.currentState.session.seed));
}

declare global {
	var state: {
		currentState: State;
	};
}
if (typeof window !== "undefined") {
	window.state = state;
}

/**
 * Use this only for client-side operations
 * For anything related to combat, use state as a parameter
 */
export const getState = (): State => {
	return state.currentState;
};

/**
 * Update the global game state
 * Used primarily for testing and scene transitions
 */
export const setState = (newState: State): void => {
	state.currentState = newState;
	setSeed(stringToSeed(newState.session.seed));
};

export const getUnitAt = (units: Unit[]) => (position: Vec2) => {
	return units.find((u) => eqVec2(u.position, position));
};

const currentScene = {
	scene: {} as Core,
};

export const setCurrentScene = (scene: Core) => {
	currentScene.scene = scene;
};

export const getCurrentScene = (): Core => {
	return currentScene.scene;
};
