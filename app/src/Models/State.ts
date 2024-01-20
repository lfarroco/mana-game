import { City } from "./City";
import { FORCE_ID_PLAYER, Force, makeForce } from "./Force";
import { vec2 } from "./Geometry";
import { Unit, makeUnit } from "./Squad";

export const initialState = (): State => ({
  debug: true,
  speed: 4,
  winner: null,
  tick: 0,
  options: {
    sound: true,
    music: true,
  },
  forces: [
    {
      ...makeForce(),
      id: FORCE_ID_PLAYER,
      name: "Player",
      color: "#00ff00",
      squads: ["s1", "s2"],
    },
  ],
  selectedUnits: [],
  selectedCities: [],
  squads: [
    {
      ...makeUnit("s1", FORCE_ID_PLAYER, "soldier"),
      position: vec2(2, 2),
    },
    {
      ...makeUnit("s2", FORCE_ID_PLAYER, "wizard"),
      position: vec2(3, 1),
    },
    {
      ...makeUnit("s4", FORCE_ID_PLAYER, "archer"),
      position: vec2(4, 2),
    },
    {
      ...makeUnit("s5", FORCE_ID_PLAYER, "barbarian"),
      position: vec2(3, 3),
    },
  ],
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
});

// make it an ioref https://gcanti.github.io/fp-ts/modules/IORef.ts.html#ioref-overview
export type State = {
  debug: boolean;
  speed: number;
  winner: null | string;
  options: {
    sound: boolean;
    music: boolean;
  };
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
};

export const getState = (): State => {
  //@ts-ignore
  return window.state;
};

export const setState = (state: State) => {
  //@ts-ignore
  window.state = state;
};

export const addForce = (s: State) => (force: Force) => {
  s.forces.push(force);
};

export const addSquad = (s: State) => (squad: Unit) => {
  s.squads.push(squad);
};

export const addCity = (s: State) => (city: City) => {
  s.cities.push(city);
};

export const updateSquad = (s: State) => (id: string) => (
  sqd: Partial<Unit>
) => {
  const squad = s.squads.find((sqd) => sqd.id === id);
  if (!squad) throw new Error("squad not found");
  Object.assign(squad, sqd);
};

export const getSquad = (s: State) => (id: string): Unit => {
  const squad = s.squads.find((sqd) => sqd.id === id);
  if (!squad) throw new Error("squad not found");
  return squad;
}

export const getCity = (s: State) => (id: string): City => {
  const city = s.cities.find((city) => city.id === id);
  if (!city) throw new Error("city not found");
  return city;
}
