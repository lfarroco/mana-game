import * as uuid from "uuid";
import { Force, playerForce } from "./Force";
import { eqVec2, snakeDistanceBetween, sortBySnakeDistance, vec2, Vec2 } from "./Geometry";
import { Unit, makeUnit } from "./Unit";
import { JobId } from "./Job";
import { getChara } from "../Scenes/Battleground/Systems/UnitManager";

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



export const getBattleUnit = (state: State) => (id: string): Unit => {
  return state.battleData.units.find((u) => u.id === id)!;
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

export function addUnitToGuild(forceId: string, jobId: JobId) {
  const state = getState();
  const unitId = uuid.v4();

  const position = getEmptySlot(state);

  const unit = makeUnit(unitId, forceId, jobId, position);

  state.gameData.player.units.push(unit);

  return unit;
}

export function getEmptySlot(state: State) {
  const startX = 6;
  const endX = 9;
  const startY = 1;
  const endY = 4;

  let isValid = false;
  let position = vec2(0, 0);

  while (!isValid) {
    for (let x = startX; x < endX; x++) {
      for (let y = startY; y < endY; y++) {
        if (!getGuildUnitAt(state)(vec2(x, y))) {
          isValid = true;
          position = vec2(x, y);
          break;
        }
      }
      if (isValid) break;
    }
  }
  return position;
}

export function getUnitsByProximity(state: State, unit: Unit, enemy: boolean, range: number): Unit[] {
  return getActiveUnits(state)
    .filter(u => enemy ? u.force !== unit.force : u.force === unit.force)
    .filter(u => u.id !== unit.id)
    .sort((a, b) => sortBySnakeDistance(unit.position)(a.position)(b.position))
    .filter(u => snakeDistanceBetween(unit.position)(u.position) <= range)
}


export function addStatus(unit: Unit, status: string, duration: number) {
  unit.statuses[status] = duration;

}
export function endStatus(unitId: string, status: string) {
  const chara = getChara(unitId);

  chara.container.getByName("status-" + status)?.destroy();

  delete chara.unit.statuses[status];

}
export function updateStatuses(state: State) {
  state.battleData.units.forEach((u) => {
    Object.keys(u.statuses).forEach((status) => {
      u.statuses[status] -= 1;
      if (u.statuses[status] < 0) {
        endStatus(u.id, status);
      }
    });
  });

}
