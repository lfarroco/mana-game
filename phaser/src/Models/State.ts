import { Force, playerForce } from "./Entities/Force";
import { eqVec2 } from "./Geometry";
import { Unit } from "./Entities/Unit";

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
	choices: string[];
};

const initialState = (): State => ({
	savedGames: [],
	gameData: {
		round: 1,
		hour: 0,
		player: playerForce,
		choices: [],
	},
	battleData: {
		forces: [],
		grid: [],
		units: [],
	},
});

const state = {
	currentState: initialState(),
};

export function resetState() {
	state.currentState = initialState();
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
