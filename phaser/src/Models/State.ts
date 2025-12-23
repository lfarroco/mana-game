import { Force, playerForce } from "./Entities/Force";
import { eqVec2 } from "./Geometry";
import { Unit } from "./Entities/Unit";
import { setSeed } from "../Utils/Random";

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
};

export type RunStats = {
	damageDealt: number;
	poisonDealt: number;
	shieldDealt: number;
	regenDealt: number;
	healDealt: number;
	mostPowerfulUnit: { name: string; power: number } | null;
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
			seed: initialSeed,
			initialSeed: initialSeed,
		},
		battleData: {
			forces: [],
			grid: [],
			units: [],
		},
	};
};

const state = {
	currentState: initialState(),
};

export function resetState() {
	playerForce.lives = 4;
	playerForce.wins = 0;
	playerForce.units = [];
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
