import * as uuid from "uuid";
import { City } from "./City";
import { Force } from "./Force";
import { Vec2 } from "./Geometry";
import { emit, signals, listeners } from "./Signals";
import { Unit, makeUnit } from "./Unit";

export const initialState = (): State => ({
  options: {
    sound: true,
    soundVolume: 0.4,
    music: true,
    musicVolume: 0.2,
    debug: true,
    speed: 4,
  },
  inputDisabled: false,
  savedGames: [],
  gameData: {
    winner: null,
    tick: 0,
    forces: [],
    selectedUnit: null,
    selectedCity: null,
    units: [],
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
    soundVolume: number;
    music: boolean;
    musicVolume: number;
    debug: boolean;
    speed: number;
  };
  savedGames: string[];
  gameData: GameData;
  inputDisabled: boolean;
};

export type GameData = {
  winner: null | string;
  ai: {
    attackers: string[];
    defenders: string[];
  };
  tick: number;
  forces: Force[];
  units: Unit[];
  selectedUnit: string | null; // TODO: remove from state, this is a UI thing. Idea: make a UI state that is not saved
  selectedCity: string | null;
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

export const addUnit = (state: State) => (unit: Unit) => {
  state.gameData.units.push(unit);
};

export const addCity = (state: State) => (city: City) => {
  state.gameData.cities.push(city);
};

export const updateUnit = (state: State) => (id: string) => (
  u: Partial<Unit>
) => {
  const unit = state.gameData.units.find((u) => u.id === id);
  if (!unit) throw new Error("unit not found");
  Object.assign(unit, u);
};

export const getUnit = (state: State) => (id: string): Unit => {
  return state.gameData.units.find((u) => u.id === id)!;
}

export const getCity = (state: State) => (id: string): City => {
  return state.gameData.cities.find((city) => city.id === id)!;
}

export const updateForce = (state: State) => (
  force: Partial<Force>
) => {
  const f = state.gameData.forces.find((f) => f.id === force.id);
  if (!f) throw new Error("force not found");
  Object.assign(f, force);
}

export const listenToStateEvents = (state: State) => {
  listeners([

    [signals.RECRUIT_UNIT, (forceId: string, jobId: string, position: Vec2) => {

      const unitId = uuid.v4();

      const unit = makeUnit(unitId, forceId, jobId, position)

      state.gameData.forces.find(f => f.id === forceId)?.units.push(unit.id)
      state.gameData.units.push(unit);

      emit(signals.UNIT_CREATED, unit.id);

    }],

    [signals.UPDATE_UNIT, (id: string, u: Partial<Unit>) => {

      const currentUnit = state.gameData.units.find((s) => s.id === id)

      if (!currentUnit) throw new Error(`unit ${id} not found`)

      updateUnit(state)(id)(u);
    }],
    [signals.DAMAGE_UNIT, (id: string, damage: number) => {

      const unit = state.gameData.units.find((u) => u.id === id);

      if (!unit) throw new Error(`unit ${id} not found`)

      const nextHp = unit.hp - damage;

      const hasDied = nextHp <= 0;

      emit(signals.UPDATE_UNIT, id, { hp: hasDied ? 0 : nextHp });

      if (hasDied) {
        emit(signals.UNIT_DESTROYED, id);
      }

    }],
    [signals.HEAL_UNIT, (id: string, amount: number) => {

      const unit = state.gameData.units.find((u) => u.id === id);

      if (!unit) throw new Error(`unit ${id} not found`)

      const nextHp = unit.hp + amount;

      emit(signals.UPDATE_UNIT, id, { hp: nextHp > unit.maxHp ? unit.maxHp : nextHp });


    }],
    [signals.UPDATE_FORCE, (force: Partial<Force>) => {
      updateForce(state)(force);
    }],
    [
      signals.UNIT_ORDER_STOP, (unitId: string) => {
        updateUnit(state)(unitId)({ order: { type: "none" } });
      }
    ]
  ])
}
