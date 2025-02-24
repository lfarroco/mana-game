import * as uuid from "uuid";
import { cpuForce, Force, playerForce } from "./Force";
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
    scrollEnabled: false,
    fogOfWarEnabled: false,
  },
  inputDisabled: false,
  savedGames: [],
  gameData: {
    winner: null,
    tick: 0,
    forces: [
      playerForce,
      cpuForce
    ],
    selectedUnit: null,
    units: [],
    grid: [],
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
    scrollEnabled: boolean;
    fogOfWarEnabled: boolean;
  };
  savedGames: string[];
  gameData: GameData;
  inputDisabled: boolean;
};

export type GameData = {
  winner: null | string;
  tick: number;
  forces: Force[];
  units: Unit[];
  selectedUnit: string | null; // TODO: remove from state, this is a UI thing. Idea: make a UI state that is not saved
  grid: number[][];
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


export const getActiveUnits = (state: State): Unit[] => state.gameData.units
  .filter(u => u.hp > 0)


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
  ])
}
