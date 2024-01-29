import { City } from "./City";
import { Force } from "./Force";
import { Vec2 } from "./Geometry";
import { emit, events, listeners } from "./Signals";
import { UNIT_STATUS, Unit, UnitStatus, makeUnit } from "./Unit";

export const initialState = (): State => ({
  options: {
    sound: true,
    music: true,
    debug: true,
    speed: 4,
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
  options: {
    sound: boolean;
    music: boolean;
    debug: boolean;
    speed: number;
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

    [events.RECRUIT_UNIT, (unitId: string, forceId: string, jobId: string, position: Vec2) => {

      const state = getState();


      const unit = makeUnit(unitId, forceId, jobId, position)

      state.gameData.forces.find(f => f.id === forceId)?.squads.push(unit.id)
      state.gameData.squads.push(unit);

      emit(events.UNIT_CREATED, unit.id);

    }],

    [events.UPDATE_SQUAD, (id: string, sqd: Partial<Unit>) => {
      const state = getState();

      const currentUnit = state.gameData.squads.find((s) => s.id === id)

      if (!currentUnit) throw new Error(`unit ${id} not found`)

      if (sqd.hp === 0 && sqd.id) {
        emit(events.SQUAD_DESTROYED, id);
      }

      // status changes
      if (sqd.status && sqd.status.type === UNIT_STATUS.ATTACKING.type && sqd.status !== currentUnit.status) {
        const attackingStatus = sqd.status as UnitStatus & { type: "ATTACKING" };
        emit(events.ATTACK_STARTED, id, attackingStatus.target);
      }

      updateSquad(state)(id)(sqd);
    }],
    [events.UPDATE_FORCE, (force: Partial<Force>) => {
      const state = getState();
      updateForce(state)(force);
    }]
  ])
}
