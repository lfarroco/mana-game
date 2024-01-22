import { City } from "./City";
import { Force } from "./Force";
import { emit, events, listeners } from "./Signals";
import { Unit } from "./Unit";

export const initialState = (): State => ({
  debug: true,
  speed: 4,
  options: {
    sound: true,
    music: true,
  },
  savedGames: [],
  gameData: {
    winner: null,
    tick: 0,
    forces: [],
    selectedUnits: [],
    selectedCities: [],
    squads: [],
    cities: [],
    map: {
      width: 128,
      height: 128,
    },
    grid: [],
    ai: {
      attackers: [],
      defenders: [],
    },
  }
});

// make it an ioref https://gcanti.github.io/fp-ts/modules/IORef.ts.html#ioref-overview
export type State = {
  debug: boolean;
  speed: number;
  options: {
    sound: boolean;
    music: boolean;
  };
  savedGames: string[];
  gameData: GameData
};
export type GameData = {
  winner: null | string;
  ai: {
    attackers: string[];
    defenders: string[];
  };
  tick: number; // TODO: remove tick from scene
  forces: Force[];
  squads: Unit[];
  selectedUnits: string[];
  selectedCities: string[];
  grid: number[][];
  cities: City[];
  map: {
    width: number;
    height: number;
  };
}

export const getState = (): State => {
  //@ts-ignore
  return window.state;
};

export const setState = (state: State) => {
  //@ts-ignore
  window.state = state;
};

export const addForce = (state: State) => (force: Force) => {
  state.gameData.forces.push(force);
};

export const addSquad = (state: State) => (squad: Unit) => {
  state.gameData.squads.push(squad);
};

export const addCity = (state: State) => (city: City) => {
  state.gameData.cities.push(city);
};

export const updateSquad = (state: State) => (id: string) => (
  sqd: Partial<Unit>
) => {
  const squad = state.gameData.squads.find((sqd) => sqd.id === id);
  if (!squad) throw new Error("squad not found");
  Object.assign(squad, sqd);
};

export const getSquad = (state: State) => (id: string): Unit => {
  const squad = state.gameData.squads.find((sqd) => sqd.id === id);
  if (!squad) throw new Error("squad not found");
  return squad;
}

export const getCity = (state: State) => (id: string): City => {
  const city = state.gameData.cities.find((city) => city.id === id);
  if (!city) throw new Error("city not found");
  return city;
}

export const updateForce = (state: State) => (
  force: Partial<Force>
) => {
  const f = state.gameData.forces.find((f) => f.id === force.id);
  if (!f) throw new Error("force not found");
  Object.assign(f, force);
}

export const listenToStateEvents = () => {
  listeners([
    [events.UPDATE_SQUAD, (id: string, sqd: Partial<Unit>) => {
      const state = getState();

      if (sqd.hp === 0 && sqd.id) {
        emit(events.SQUAD_DESTROYED, sqd.id);
      }
      updateSquad(state)(id)(sqd);
    }],
    [events.UPDATE_FORCE, (force: Partial<Force>) => {
      const state = getState();
      updateForce(state)(force);
    }]
  ])
}
