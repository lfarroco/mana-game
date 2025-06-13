import { Force, playerForce } from "./Entities/Force";
import { eqVec2, Vec2 } from "./Geometry";
import { Unit } from "./Entities/Unit";
import { getChara } from "../Scenes/Battleground/Systems/CharaManager";
import { UNIT_EVENT_NO_OP, UnitEvent } from "./UnitEvents";

export const initialState = (): State => ({
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

  chara.getByName("status-" + status)?.destroy();

  delete chara.unit.statuses[status];

}