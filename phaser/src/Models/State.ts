import { Force, makeForce } from "./Entities/Force";
import { eqVec2 } from "./ServerGeometry";
import { Unit } from "./Entities/Unit";
import { setSeed } from "../Utils/Random";
import { FORCE_ID_PLAYER } from "../Scenes/Battleground/ServerConstants";

export type State = {
	savedGames: string[];
	gameData: GameData;
	battleData: {
		forces: Force[];
		grid: number[][];
		units: Unit[];
	};
};

export type GameData = {
	round: number;
	hour: number;
	player: Force;
	recentEncounterIds: string[];
	runStats: RunStats;
	seed: number;
	initialSeed: number;
	isSeeded: boolean;
	playerId?: string; // Player ID for server communication (single-player and multiplayer)
};

export type RunStats = {
	damageDealt: number;
	poisonDealt: number;
	shieldDealt: number;
	regenDealt: number;
	healDealt: number;
	mostPowerfulUnit: { cardId: string; power: number } | null;
	totalUnitsRecruited: number;
	unitUsage: Record<string, number>;
};

const initialState = (): State => {
	const initialSeed = Date.now();
	return {
		savedGames: [],
		gameData: {
			round: 1,
			hour: 0,
			player: makeForce(FORCE_ID_PLAYER),
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
			seed: initialSeed,
			initialSeed: initialSeed,
			isSeeded: false,
		},
		battleData: {
			forces: [],
			grid: [],
			units: [],
		},
	};
};

let state: {
	currentState: State;
} = {

} as any;

export const initState = () => {
	state.currentState = initialState();
}


export function resetState() {
	state.currentState = initialState();
	setSeed(state.currentState.gameData.seed);
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

export const getUnitAt = (units: Unit[]) => (position: Vec2) => {
	return units.find((u) => eqVec2(u.position, position));
};

let currentScene = {
	scene: {} as Phaser.Scene,
};

export const setCurrentScene = (scene: Phaser.Scene) => {
	currentScene.scene = scene;
};

export const getCurrentScene = (): Phaser.Scene => {
	return currentScene.scene;
};
