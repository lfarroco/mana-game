import Events from "events";
import { Vec2 } from "./Geometry";
import { Unit } from "./Unit";
import { Direction } from "./Direction";
import { GameData } from "./State";
import { Force } from "./Force";

export type Signals = {
  SET_ROUTE: (route: string) => void;
  START_NEW_GAME: () => void;
  PAUSE_GAME: () => void;
  RESUME_GAME: () => void;
  PLAY_MUSIC: () => void;
  STOP_MUSIC: () => void;
  SAVE_GAME: (gameData: GameData, name: string) => void;
  LOAD_GAME: (key: string) => void;
  DELETE_GAME: (key: string) => void;
  BATTLEGROUND_STARTED: () => void;
  UNITS_SELECTED: (squadId: string[]) => void;
  UNITS_DESELECTED: (squadId: string[]) => void;
  CITIES_SELECTED: (ids: string[]) => void;
  CITIES_DESELECTED: (ids: string[]) => void;
  SELECT_SQUAD_MOVE_START: (squadId: string) => void;
  SELECT_SQUAD_MOVE_DONE: (squadIds: string[], target: Vec2) => void;
  SELECT_SQUAD_MOVE_CANCEL: (squadId: string) => void;
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
  // TODO: have a parent level for the system
  ATTACK_STARTED: (squadId: string, target: string) => any;
  ATTACK: (attacker: string, defender: string) => any;
  COMBAT_FINISHED: (unitId: string) => any;
  UPDATE_SQUAD: (squadId: string, sqd: Partial<Unit>) => any;
  SQUAD_DESTROYED: (squadId: string) => any;
  FORCE_VICTORY: (force: string) => void;
  CAPTURE_CITY: (squadId: string, cityId: string) => void;
  SQUAD_WALKS_TOWARDS_CELL: (
    squadId: string,
    vec: Vec2,
    walked: number,
    total: number
  ) => void;
  SQUAD_LEAVES_CELL: (squadId: string, vec: Vec2) => void;
  SQUAD_MOVED_INTO_CELL: (squadId: string, vec: Vec2) => void;
  UPDATE_SQUAD_COUNTER: (count: number, vec: Vec2) => void; // TODO: not implemented yet
  LOOKUP_PATH: (key: string, source: Vec2, target: Vec2) => void;
  PATH_FOUND: (key: string, path: Vec2[]) => void;
  CHANGE_DIRECTION: (key: string, vec: Vec2) => void;
  CREATE_EMOTE: (id: string, key: string) => void;
  REMOVE_EMOTE: (squadId: string) => void;
  FACE_DIRECTION: (squadId: string, direction: Direction) => void; // TODO: change to vec2
  SQUAD_FINISHED_MOVE_ANIM: (squadId: string, vec: Vec2) => void;
};

export type Operation = [keyof Signals, ...Parameters<Signals[keyof Signals]>];

export const signals: { [key in keyof Signals]: keyof Signals } = {
  SET_ROUTE: "SET_ROUTE",
  START_NEW_GAME: "START_NEW_GAME",
  PAUSE_GAME: "PAUSE_GAME",
  RESUME_GAME: "RESUME_GAME",
  PLAY_MUSIC: "PLAY_MUSIC",
  STOP_MUSIC: "STOP_MUSIC",
  SAVE_GAME: "SAVE_GAME",
  LOAD_GAME: "LOAD_GAME",
  DELETE_GAME: "DELETE_GAME",
  UPDATE_FORCE: "UPDATE_FORCE",
  BATTLEGROUND_STARTED: "BATTLEGROUND_STARTED",
  SELECT_SQUAD_MOVE_START: "SELECT_SQUAD_MOVE_START",
  SELECT_SQUAD_MOVE_DONE: "SELECT_SQUAD_MOVE_DONE",
  SELECT_SQUAD_MOVE_CANCEL: "SELECT_SQUAD_MOVE_CANCEL",
  UNITS_SELECTED: "UNITS_SELECTED",
  UNITS_DESELECTED: "UNITS_DESELECTED",
  CITIES_SELECTED: "CITIES_SELECTED",
  CITIES_DESELECTED: "CITIES_DESELECTED",
  TOGGLE_DISPATCH_MODAL: "TOGGLE_DISPATCH_MODAL",
  TOGGLE_OPTIONS_MODAL: "TOGGLE_OPTIONS_MODAL",
  TOGGLE_LOAD_GAME_MODAL: "TOGGLE_LOAD_GAME_MODAL",
  TOGGLE_SAVE_GAME_MODAL: "TOGGLE_SAVE_GAME_MODAL",
  TOGGLE_RECRUIT_MODAL: "TOGGLE_RECRUIT_MODAL",
  RECRUIT_UNIT: "RECRUIT_UNIT",
  UNIT_CREATED: "UNIT_CREATED",
  CHARA_CREATED: "CHARA_CREATED",
  BATTLEGROUND_TICK: "BATTLEGROUND_TICK",
  ATTACK_STARTED: "ATTACK_STARTED",
  ATTACK: "ATTACK",
  COMBAT_FINISHED: "COMBAT_FINISHED",
  CHANGE_DIRECTION: "CHANGE_DIRECTION",
  UPDATE_SQUAD: "UPDATE_SQUAD",
  SQUAD_DESTROYED: "SQUAD_DESTROYED",
  FORCE_VICTORY: "FORCE_VICTORY",
  CAPTURE_CITY: "CAPTURE_CITY",
  SQUAD_WALKS_TOWARDS_CELL: "SQUAD_WALKS_TOWARDS_CELL",
  SQUAD_LEAVES_CELL: "SQUAD_LEAVES_CELL",
  SQUAD_MOVED_INTO_CELL: "SQUAD_MOVED_INTO_CELL",
  UPDATE_SQUAD_COUNTER: "UPDATE_SQUAD_COUNTER",
  LOOKUP_PATH: "LOOKUP_PATH",
  PATH_FOUND: "PATH_FOUND",
  CREATE_EMOTE: "CREATE_EMOTE",
  REMOVE_EMOTE: "REMOVE_EMOTE",
  FACE_DIRECTION: "FACE_DIRECTION",
  SQUAD_FINISHED_MOVE_ANIM: "SQUAD_FINISHED_MOVE_ANIM",
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

export const operations: {
  [key in keyof Signals]: (...args: Parameters<Signals[key]>) => Operation;
} = {
  SET_ROUTE: (route: string) => [signals.SET_ROUTE, route],
  START_NEW_GAME: () => [signals.START_NEW_GAME],
  PAUSE_GAME: () => [signals.PAUSE_GAME],
  RESUME_GAME: () => [signals.RESUME_GAME],
  PLAY_MUSIC: () => [signals.PLAY_MUSIC],
  STOP_MUSIC: () => [signals.STOP_MUSIC],
  UPDATE_FORCE: (force: Partial<Force>) => [signals.UPDATE_FORCE, force],
  SAVE_GAME: () => [signals.SAVE_GAME],
  LOAD_GAME: (key: string) => [signals.LOAD_GAME, key],
  DELETE_GAME: (key: string) => [signals.DELETE_GAME, key],
  SELECT_SQUAD_MOVE_START: (sqdId: string) => [
    signals.SELECT_SQUAD_MOVE_START,
    sqdId,
  ],
  SELECT_SQUAD_MOVE_DONE: (sqdIds: string[], target: Vec2) => [
    signals.SELECT_SQUAD_MOVE_DONE,
    sqdIds,
    target,
  ],
  SELECT_SQUAD_MOVE_CANCEL: (sqdId: string) => [
    signals.SELECT_SQUAD_MOVE_CANCEL,
    sqdId,
  ],
  UNITS_SELECTED: (ids: string[]) => [signals.UNITS_SELECTED, ids],
  UNITS_DESELECTED: (ids: string[]) => [signals.UNITS_DESELECTED, ids],
  CITIES_SELECTED: (ids: string[]) => [signals.CITIES_SELECTED, ids],
  CITIES_DESELECTED: (ids: string[]) => [signals.CITIES_DESELECTED, ids],
  TOGGLE_DISPATCH_MODAL: (value: boolean) => [
    signals.TOGGLE_DISPATCH_MODAL,
    value,
  ],
  TOGGLE_OPTIONS_MODAL: (value: boolean) => [
    signals.TOGGLE_OPTIONS_MODAL,
    value,
  ],
  TOGGLE_LOAD_GAME_MODAL: (value: boolean) => [
    signals.TOGGLE_LOAD_GAME_MODAL,
    value,
  ],
  TOGGLE_SAVE_GAME_MODAL: (value: boolean) => [
    signals.TOGGLE_SAVE_GAME_MODAL,
    value,
  ],
  TOGGLE_RECRUIT_MODAL: () => [signals.TOGGLE_RECRUIT_MODAL],
  RECRUIT_UNIT: (forceId: string, jobId: string, location: Vec2) => [signals.RECRUIT_UNIT, forceId, jobId, location],
  UNIT_CREATED: (unitId: string) => [signals.UNIT_CREATED, unitId],
  CHARA_CREATED: (charaId: string) => [signals.CHARA_CREATED, charaId],
  BATTLEGROUND_STARTED: () => [signals.BATTLEGROUND_STARTED],
  BATTLEGROUND_TICK: (tick: number) => [signals.BATTLEGROUND_TICK, tick],
  ATTACK_STARTED: (squadId: string, target: string) => [signals.ATTACK_STARTED, squadId, target],
  ATTACK: (attacker: string, defender: string) => [
    signals.ATTACK,
    attacker,
    defender,
  ],
  COMBAT_FINISHED: (unitId: string) => [signals.COMBAT_FINISHED, unitId],
  UPDATE_SQUAD: (squadId: string, sqd: Partial<Unit>) => [
    signals.UPDATE_SQUAD,
    squadId,
    sqd,
  ],
  SQUAD_DESTROYED: (squadId: string) => [signals.SQUAD_DESTROYED, squadId],
  FORCE_VICTORY: (force: string) => [signals.FORCE_VICTORY, force],
  CAPTURE_CITY: (squadId: string, cityId: string) => [
    signals.CAPTURE_CITY,
    squadId,
    cityId,
  ],
  SQUAD_WALKS_TOWARDS_CELL: (
    squadId: string,
    vec: Vec2,
    walked: number,
    total: number
  ) => [signals.SQUAD_WALKS_TOWARDS_CELL, squadId, vec, walked, total],
  SQUAD_LEAVES_CELL: (squadId: string, vec: Vec2) => [
    signals.SQUAD_LEAVES_CELL,
    squadId,
    vec,
  ],
  SQUAD_MOVED_INTO_CELL: (squadId: string, vec: Vec2) => [
    signals.SQUAD_MOVED_INTO_CELL,
    squadId,
    vec,
  ],
  UPDATE_SQUAD_COUNTER: (count: number, vec: Vec2) => [
    signals.UPDATE_SQUAD_COUNTER,
    count,
    vec,
  ],
  LOOKUP_PATH: (key: string, source: Vec2, target: Vec2) => [
    signals.LOOKUP_PATH,
    key,
    source,
    target,
  ],
  PATH_FOUND: (key: string, path: Vec2[]) => [signals.PATH_FOUND, key, path],
  CREATE_EMOTE: (id: string, key: string) => [signals.CREATE_EMOTE, id, key],
  REMOVE_EMOTE: (squadId: string) => [signals.REMOVE_EMOTE, squadId],
  FACE_DIRECTION: (squadId: string, direction: Direction) => [
    signals.FACE_DIRECTION,
    squadId,
    direction,
  ],
  SQUAD_FINISHED_MOVE_ANIM: (squadId: string, vec: Vec2) => [
    signals.SQUAD_FINISHED_MOVE_ANIM,
    squadId,
    vec
  ],
  CHANGE_DIRECTION: (key: string, vec: Vec2) => [
    signals.CHANGE_DIRECTION,
    key,
    vec,
  ],
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

