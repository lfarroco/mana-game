import { Force, playerForce } from "./Entities/Force";
import { eqVec2 } from "./Geometry";
import { Unit } from "./Entities/Unit";

export type State = {
  currentScene: Phaser.Scene;
  savedGames: string[];
  gameData: GameData;
  battleData: {
    forces: Force[];
    grid: number[][];
    units: Unit[];
  }
};

export type GameData = {
  round: number;
  hour: number;
  player: Force;
  choices: string[];
}

const initialState = (): State => ({
  currentScene: {} as Phaser.Scene,
  savedGames: [],
  gameData: {
    round: 1,
    hour: 0,
    player: playerForce,
    choices: []
  },
  battleData: {
    forces: [],
    grid: [],
    units: []
  }
});

let currentState = initialState();

if (process.env.NODE_ENV === 'development') {
  //@ts-ignore
  window.state = currentState;
}

export const getState = (): State => {
  return currentState;
};

export const getUnitAt = (units: Unit[]) => (position: Vec2) => {
  return units.find((u) => eqVec2(u.position, position));
}

export const getCurrentScene = (): Phaser.Scene => {
  return currentState.currentScene;
};
