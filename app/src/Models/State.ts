import * as uuid from "uuid";
import { Force, playerForce } from "./Force";
import { eqVec2, snakeDistanceBetween, sortBySnakeDistance, vec2, Vec2 } from "./Geometry";
import { emit, signals, listeners } from "./Signals";
import { Unit, makeUnit } from "./Unit";
import { JobId } from "./Job";

export const initialState = (): State => ({
  options: {
    sound: true,
    soundVolume: 0.4,
    music: true,
    musicVolume: 0.2,
    debug: true,
    speed: 6,
  },
  savedGames: [],
  gameData: {
    tick: 0,
    hour: 1,
    day: 1,
    player: playerForce,
    choices: []
  },
  battleData: {
    forces: [],
    grid: [],
    units: []
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
  battleData: {
    forces: Force[];
    grid: number[][];
    units: Unit[];
  }
};

export type GameData = {
  tick: number;
  hour: number;
  day: number;
  player: Force;
  choices: string[];
}

export const getState = (): State => {
  //@ts-ignore
  return window.state;
};

export const setState = (state: State) => {
  //@ts-ignore
  window.state = state;
};




export const updateUnit = (state: State) => (id: string) => (
  u: Partial<Unit>
) => {
  const unit = state.battleData.units.find((u) => u.id === id);
  if (!unit) throw new Error("unit not found");
  Object.assign(unit, u);
};

export const getUnit = (state: State) => (id: string): Unit => {
  return state.battleData.units.find((u) => u.id === id)!;
}

export const getActiveUnits = (state: State): Unit[] => state.battleData.units
  .filter(u => u.hp > 0)

export const getAllActiveFoes = (state: State) => (forceId: string): Unit[] => {
  return getActiveUnits(state).filter(u => u.force !== forceId);
}

export const getUnitAt = (state: State) => (position: Vec2): Unit | undefined => {
  return getActiveUnits(state).find((u) => eqVec2(u.position, position));
}

export const listenToStateEvents = (state: State) => {
  listeners([

    [signals.ADD_UNIT_TO_GUILD, (forceId: string, jobId: JobId) => {

      const unitId = uuid.v4();

      const startX = 6;
      const endX = 9;
      const startY = 2;
      const endY = 5;

      let isValid = false;
      let position = vec2(0, 0);

      while (!isValid) {
        for (let x = startX; x < endX; x++) {
          for (let y = startY; y < endY; y++) {
            if (!getUnitAt(state)(vec2(x, y))) {
              isValid = true;
              position = vec2(x, y);
              break;
            }
          }
          if (isValid) break;
        }
      }

      const unit = makeUnit(unitId, forceId, jobId, position);

      state.gameData.player.units.push(unit);
      state.battleData.units.push({ ...unit });

      emit(signals.UNIT_CREATED, unit.id);

    }],

    [signals.UPDATE_UNIT, (id: string, u: Partial<Unit>) => {

      const currentUnit = state.battleData.units.find((s) => s.id === id)

      if (!currentUnit) throw new Error(`unit ${id} not found`)

      updateUnit(state)(id)(u);
    }],
    [signals.DAMAGE_UNIT, (id: string, damage: number) => {

      const unit = state.battleData.units.find((u) => u.id === id);

      if (!unit) throw new Error(`unit ${id} not found`)

      const nextHp = unit.hp - damage;

      const hasDied = nextHp <= 0;

      emit(signals.UPDATE_UNIT, id, { hp: hasDied ? 0 : nextHp });

      if (hasDied) {
        emit(signals.UNIT_DESTROYED, id);
      }

    }],
    [signals.HEAL_UNIT, (id: string, amount: number) => {

      const unit = state.battleData.units.find((u) => u.id === id);

      if (!unit) throw new Error(`unit ${id} not found`)

      const nextHp = unit.hp + amount;

      emit(signals.UPDATE_UNIT, id, { hp: nextHp > unit.maxHp ? unit.maxHp : nextHp });


    }],

    [signals.ADD_STATUS, (id: string, status: string, duration: number) => {

      const unit = state.battleData.units.find((u) => u.id === id)!;

      unit.statuses[status] = duration;

    }],
    [signals.TURN_START, (tick: number) => {

      state.battleData.units.forEach((u) => {
        Object.keys(u.statuses).forEach((status) => {
          u.statuses[status] -= 1;
          if (u.statuses[status] < 0) {
            emit(signals.END_STATUS, u.id, status);
            delete u.statuses[status];
          }
        });
      });
    }],

  ])
}

export function getUnitsByProximity(state: State, unit: Unit, enemy: boolean, range: number): Unit[] {
  return getActiveUnits(state)
    .filter(u => enemy ? u.force !== unit.force : u.force === unit.force)
    .filter(u => u.id !== unit.id)
    .sort((a, b) => sortBySnakeDistance(unit.position)(a.position)(b.position))
    .filter(u => snakeDistanceBetween(unit.position)(u.position) <= range)
}

