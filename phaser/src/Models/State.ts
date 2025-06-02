import { Force, playerForce } from "./Force";
import { eqVec2, Vec2 } from "./Geometry";
import { Unit, makeUnit } from "./Unit";
import { getChara } from "../Scenes/Battleground/Systems/CharaManager";
import { getEmptySlot } from "./Board";
import { UNIT_EVENT_NO_OP, UnitEvent } from "./UnitEvents";

// TODO: make this not import things from phaser

// get ?speed=x parameter from url
let speed = 2;

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has("speed")) {
  const paramSpeed = urlParams.get("speed");
  if (paramSpeed) {
    const parsedSpeed = parseFloat(paramSpeed);
    if (!isNaN(parsedSpeed)) {
      speed = parsedSpeed;
    }
  }
}

let debug = false;
if (urlParams.has("debug")) {
  const paramDebug = urlParams.get("debug");
  if (paramDebug) {
    const parsedDebug = paramDebug === "true";
    if (parsedDebug) {
      debug = parsedDebug;
    }
  }
}

export const initialState = (): State => ({
  options: {
    sound: true,
    soundVolume: 0.4,
    music: true,
    musicVolume: 0.2,
    debug,
    speed, // TODO: remove references from non-animation code
  },
  savedGames: [],
  gameData: {
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

// todo: make it a type that describes an ioref
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

export const getUnitAt = (units: Unit[]) => (position: Vec2) => {
  return units.find((u) => eqVec2(u.position, position));
}

export function addUnitToGuild(forceId: string, jobId: string) {
  const state = getState();

  const position = getEmptySlot(state.gameData.player.units, playerForce.id);

  if (!position) {
    throw new Error("No empty slot available");
  }

  const unit = makeUnit(forceId, jobId, position);

  state.gameData.player.units.push(unit);

  return unit;
}

export function addStatus(
  unit: Unit,
  status: string,
  duration: number = Infinity,
  effect: UnitEvent = UNIT_EVENT_NO_OP,
  onEnd: UnitEvent = UNIT_EVENT_NO_OP,
) {
  unit.statuses[status] = {
    effect,
    onEnd,
    duration
  }
}

// TODO: add "on status removed" to unit events
export function endStatus(unitId: string, status: string) {
  const chara = getChara(unitId);

  chara.container.getByName("status-" + status)?.destroy();

  delete chara.unit.statuses[status];

}