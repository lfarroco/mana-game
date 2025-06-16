import { Force, playerForce } from "./Entities/Force";
import { eqVec2, Vec2 } from "./Geometry";
import { Unit } from "./Entities/Unit";

// Module-scoped variable to hold the state, similar to currentOptions in OptionsStore
let _currentState: State;

// Define a more specific type for the player object within GameData
// This ensures 'units' property is recognized by TypeScript for type safety.
export type PlayerWithUnits = Force & {
  units: Unit[],
  prestige: number,
  winStreak: number,
  lossStreak: number,
  totalRoundsPlayed: number };

export const initialState = (): State => ({
  savedGames: [],
  gameData: {
    round: 1,
    // Ensure the player object conforms to PlayerWithUnits, especially the 'units' array.
    // This safely handles if playerForce (of type Force) might not have 'units' defined,
    // or if it does, it uses them.
    player: {
      ...playerForce,
      units: (playerForce as Partial<PlayerWithUnits>).units || [],
      prestige: 0,
      winStreak: 0,
      lossStreak: 0,
      totalRoundsPlayed: 0,
    },
    choices: []
  },
  battleData: {
    forces: [],
    grid: [],
    units: []
  }
});

/**
 * Initializes the global state.
 * This function should be called once at the beginning of the application, similar to initializeOptionsStore.
 */
export function initializeGlobalState(): void {
  _currentState = initialState();
}

// todo: make it a type that describes an ioref
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
  player: PlayerWithUnits; // Use the more specific type for player
  choices: string[];
}

/**
 * Retrieves a copy of the current global game state.
 * If the state is not initialized, it initializes it first.
 * @returns A shallow copy of the State object.
 */
export const getState = (): State => {
  if (!_currentState) {
    console.warn("Global state not initialized. Calling initializeGlobalState() first. Returning defaults.");
    initializeGlobalState();
  }
  return { ..._currentState }; // Return a shallow copy to prevent direct external mutation
};

/**
 * Sets the global game state.
 * @param newState The new state to set.
 */
export const setState = (newState: State): void => {
  _currentState = newState; // Replace the entire state object
};

export const getBattleUnit = (state: State) => (id: string): Unit => {
  const unit = state.battleData.units.find((u) => u.id === id);
  if (!unit) {
    throw new Error(`Battle unit with id "${id}" not found.`);
  }
  return unit;
}

export const getActiveUnits = (state: State): Unit[] => state.battleData.units
  .filter(u => u.hp > 0)

export const getAllActiveFoes = (state: State) => (forceId: string): Unit[] => {
  return getActiveUnits(state).filter(u => u.force !== forceId);
}

export const getBattleUnitAt = (state: State) => (position: Vec2): Unit | undefined => {
  return getActiveUnits(state).find((u) => eqVec2(u.position, position));
}

export const getGuildUnitAt = (state: State) => (position: Vec2): Unit | undefined => {
  return state.gameData.player.units.find((u) => eqVec2(u.position, position));
}

export const getGuildUnit = (state: State) => (id: string): Unit | undefined => {
  return state.gameData.player.units.find((u) => u.id === id);
}

export const getUnitAt = (units: Unit[]) => (position: Vec2) => {
  return units.find((u) => eqVec2(u.position, position));
}
