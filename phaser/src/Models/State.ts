import { Force, playerForce } from "./Entities/Force";
import { eqVec2, Vec2 } from "./Geometry.pure";
import { Unit } from "./Entities/Unit";

export type State = {
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
  player: Force;
  choices: string[];
}

const initialState = (): State => ({
  savedGames: [],
  gameData: {
    round: 1,
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

export const getState = (): State => {
  return currentState;
};

export const getUnitAt = (units: Unit[]) => (position: Vec2) => {
  return units.find((u) => eqVec2(u.position, position));
}