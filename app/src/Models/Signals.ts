import Events from "events";
import { Vec2 } from "./Geometry";
import { Unit } from "./Unit";
import { GameData } from "./State";
import { Force } from "./Force";

export type Signals = {
  SET_ROUTE: (route: string) => void;
  START_NEW_GAME: () => void;

  TURN_START: () => void;
  TURN_END: () => void;

  PAUSE_GAME: () => void;
  RESUME_GAME: () => void;

  PLAY_MUSIC: () => void;
  STOP_MUSIC: () => void;

  SAVE_GAME: (gameData: GameData, name: string) => void;
  LOAD_GAME: (key: string) => void;
  DELETE_GAME: (key: string) => void;

  BATTLEGROUND_STARTED: () => void;

  UNIT_SELECTED: (unitId: string) => void;
  UNIT_DESELECTED: (unitId: string) => void;

  CITY_SELECTED: (id: string | null) => void;
  CITY_DESELECTED: () => void;

  UNIT_MOVE_STOP: (unitId: string) => void;

  SELECT_UNIT_MOVE_START: (unitId: string) => void;
  SELECT_UNIT_MOVE_DONE: (unitIds: string[], target: Vec2) => void;
  SELECT_UNIT_MOVE_CANCEL: (unitId: string) => void;

  SELECT_SKILL_TARGET_START: (unitId: string, skill: string) => void;
  SELECT_SKILL_TARGET_DONE: (tile: Vec2) => void;
  SELECT_SKILL_TARGET_CANCEL: () => void;

  TOGGLE_DISPATCH_MODAL: (value: boolean) => void;
  TOGGLE_OPTIONS_MODAL: (value: boolean) => void;
  TOGGLE_LOAD_GAME_MODAL: (value: boolean) => void;
  TOGGLE_SAVE_GAME_MODAL: (value: boolean) => void;
  TOGGLE_RECRUIT_MODAL: () => void;
  // When a unit is added to a force
  RECRUIT_UNIT: (forceId: string, jobId: string, location: Vec2) => void;
  // When a unit is finished being added to a force
  UNIT_CREATED: (unitId: string) => void;
  // When a chara is created in the map
  CHARA_CREATED: (charaId: string) => void;
  BATTLEGROUND_TICK: (tick: number) => void;
  UPDATE_FORCE: (force: Partial<Force>) => void;

  MAKE_UNIT_IDLE: (unitId: string) => void;

  // TODO: have a parent level for the system
  UPDATE_UNIT: (unitId: string, u: Partial<Unit>) => any;
  DAMAGE_UNIT: (unitId: string, damage: number) => any;
  HEAL_UNIT: (unitId: string, amount: number) => any;
  UNIT_DESTROYED: (unitId: string) => any;
  FORCE_VICTORY: (force: string) => void;
  CAPTURE_CITY: (unitId: string, cityId: string) => void;
  MOVE_UNIT_INTO_CELL_START: (unitId: string, vec: Vec2) => void;
  MOVE_UNIT_INTO_CELL_FINISH: (unitId: string, vec: Vec2) => void;
  MOVEMENT_FINISHED: (unitId: string, vec: Vec2) => void;

  PATH_FOUND: (key: string, path: Vec2[]) => void;

  DISPLAY_EMOTE: (id: string, key: string) => void;
  HIDE_EMOTE: (unitId: string) => void;
};

export type Operation = [keyof Signals, ...Parameters<Signals[keyof Signals]>];

export const signals: { [key in keyof Signals]: keyof Signals } = {
  SET_ROUTE: "SET_ROUTE",
  START_NEW_GAME: "START_NEW_GAME",
  PAUSE_GAME: "PAUSE_GAME",
  RESUME_GAME: "RESUME_GAME",
  TURN_START: "TURN_START",
  TURN_END: "TURN_END",
  PLAY_MUSIC: "PLAY_MUSIC",
  STOP_MUSIC: "STOP_MUSIC",
  SAVE_GAME: "SAVE_GAME",
  LOAD_GAME: "LOAD_GAME",
  DELETE_GAME: "DELETE_GAME",
  UPDATE_FORCE: "UPDATE_FORCE",
  BATTLEGROUND_STARTED: "BATTLEGROUND_STARTED",
  SELECT_UNIT_MOVE_START: "SELECT_UNIT_MOVE_START",
  SELECT_UNIT_MOVE_DONE: "SELECT_UNIT_MOVE_DONE",
  SELECT_UNIT_MOVE_CANCEL: "SELECT_UNIT_MOVE_CANCEL",
  MAKE_UNIT_IDLE: "MAKE_UNIT_IDLE",
  UNIT_SELECTED: "UNIT_SELECTED",
  UNIT_DESELECTED: "UNIT_DESELECTED",
  CITY_SELECTED: "CITY_SELECTED",
  CITY_DESELECTED: "CITY_DESELECTED",
  TOGGLE_DISPATCH_MODAL: "TOGGLE_DISPATCH_MODAL",
  TOGGLE_OPTIONS_MODAL: "TOGGLE_OPTIONS_MODAL",
  TOGGLE_LOAD_GAME_MODAL: "TOGGLE_LOAD_GAME_MODAL",
  TOGGLE_SAVE_GAME_MODAL: "TOGGLE_SAVE_GAME_MODAL",
  TOGGLE_RECRUIT_MODAL: "TOGGLE_RECRUIT_MODAL",
  RECRUIT_UNIT: "RECRUIT_UNIT",
  UNIT_CREATED: "UNIT_CREATED",
  CHARA_CREATED: "CHARA_CREATED",
  BATTLEGROUND_TICK: "BATTLEGROUND_TICK",
  UPDATE_UNIT: "UPDATE_UNIT",
  DAMAGE_UNIT: "DAMAGE_UNIT",
  HEAL_UNIT: "HEAL_UNIT",
  UNIT_DESTROYED: "UNIT_DESTROYED",
  FORCE_VICTORY: "FORCE_VICTORY",
  CAPTURE_CITY: "CAPTURE_CITY",
  MOVE_UNIT_INTO_CELL_START: "MOVE_UNIT_INTO_CELL_START",
  MOVE_UNIT_INTO_CELL_FINISH: "MOVE_UNIT_INTO_CELL_FINISH",
  MOVEMENT_FINISHED: "MOVEMENT_FINISHED",
  PATH_FOUND: "PATH_FOUND",
  DISPLAY_EMOTE: "DISPLAY_EMOTE",
  HIDE_EMOTE: "HIDE_EMOTE",
  UNIT_MOVE_STOP: "UNIT_MOVE_STOP",
  SELECT_SKILL_TARGET_START: "SELECT_SKILL_TARGET_START",
  SELECT_SKILL_TARGET_DONE: "SELECT_SKILL_TARGET_DONE",
  SELECT_SKILL_TARGET_CANCEL: "SELECT_SKILL_TARGET_CANCEL",
};

export const listen = <T extends keyof Signals>(
  event: T,
  callback: Signals[T]
): (() => void) => {
  const emitter: Events = window.emitter;
  emitter.on(event, callback);
  return () => {
    emitter.off(event, callback);
  };
};

export const emit = <T extends keyof Signals>(
  event: T,
  ...args: Parameters<Signals[T]>
) => {
  const emitter: Events = window.emitter;
  console.log(`emit("${event}", ...${JSON.stringify(args)})`);
  emitter.emit(event, ...args);
};

export const emit_ = <T extends keyof Signals>(
  event: T,
  ...args: Parameters<Signals[T]>
) => {
  return () => emit(event, ...args);
};

export const sequence = (operations: Operation[]) => {
  operations.forEach(([event, ...args]) => {
    emit(event, ...args);
  });
};

// example usage:
// listeners([
// 	[ "A", ()=>{ do stuff}],
// 	[ "B", ()=>{ do stuff}],
// ])
// TODO: the listener can inject the state in every callback
export const listeners = <T extends keyof Signals>(
  listeners: [T, Signals[T]][]
) => {
  listeners.forEach(([event, callback]) => {
    listen(event, callback);
  });
};

//@ts-ignore
window.emit = emit;

export function foldMap<A>(data: A[], fn: (a: A) => Operation[]): Operation[] {
  return data.reduce((ops, item) => {
    const res = fn(item);

    return ops.concat(res);
  }, [] as Operation[]);
}
export function traverse_<A>(data: A[], fn: (a: A) => Operation[]) {
  data.forEach((item) => {
    const res = fn(item);
    sequence(res);
  });
}

