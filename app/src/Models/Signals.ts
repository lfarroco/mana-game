import Events from "events";
import { Vec2 } from "./Geometry";
import { Unit } from "./Squad";
import { Direction } from "./Direction";

export type Signals = {
  SET_ROUTE: (route: string) => void;
  START_GAME: () => void;
  PAUSE_GAME: () => void;
  RESUME_GAME: () => void;
  PLAY_MUSIC: () => void;
  STOP_MUSIC: () => void;
  UNITS_SELECTED: (squadId: string[]) => void;
  CITIES_SELECTED: (ids: string[]) => void;
  SELECT_SQUAD_MOVE_START: (squadId: string) => void;
  SELECT_SQUAD_MOVE_DONE: (squadIds: string[], target: Vec2) => void;
  SELECT_SQUAD_MOVE_CANCEL: (squadId: string) => void;
  TOGGLE_DISPATCH_MODAL: (value: boolean) => void;
  TOGGLE_OPTIONS_MODAL: (value: boolean) => void;
  TOGGLE_LOAD_GAME_MODAL: (value: boolean) => void;
  TOGGLE_RECRUIT_MODAL: () => void;
  DISPATCH_SQUAD: (squadId: string) => void;
  TOGGLE_SQUADS_WINDOW: (value: boolean) => void;
  BATTLEGROUND_TICK: (tick: number) => void;
  // TODO: have a parent level for the system
  ATTACK: (attacker: string, defender: string) => any;
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
  FACE_DIRECTION: (squadId: string, direction: Direction) => void;
  SQUAD_FINISHED_MOVE_ANIM: (squadId: string) => void;
};

export type Operation = [keyof Signals, ...Parameters<Signals[keyof Signals]>];

export const events: { [key in keyof Signals]: keyof Signals } = {
  SET_ROUTE: "SET_ROUTE",
  START_GAME: "START_GAME",
  PAUSE_GAME: "PAUSE_GAME",
  RESUME_GAME: "RESUME_GAME",
  PLAY_MUSIC: "PLAY_MUSIC",
  STOP_MUSIC: "STOP_MUSIC",
  SELECT_SQUAD_MOVE_START: "SELECT_SQUAD_MOVE_START",
  SELECT_SQUAD_MOVE_DONE: "SELECT_SQUAD_MOVE_DONE",
  SELECT_SQUAD_MOVE_CANCEL: "SELECT_SQUAD_MOVE_CANCEL",
  UNITS_SELECTED: "UNITS_SELECTED",
  CITIES_SELECTED: "CITIES_SELECTED",
  TOGGLE_DISPATCH_MODAL: "TOGGLE_DISPATCH_MODAL",
  TOGGLE_OPTIONS_MODAL: "TOGGLE_OPTIONS_MODAL",
  TOGGLE_LOAD_GAME_MODAL: "TOGGLE_LOAD_GAME_MODAL",
  TOGGLE_RECRUIT_MODAL: "TOGGLE_RECRUIT_MODAL",
  DISPATCH_SQUAD: "DISPATCH_SQUAD",
  TOGGLE_SQUADS_WINDOW: "TOGGLE_SQUADS_WINDOW",
  BATTLEGROUND_TICK: "BATTLEGROUND_TICK",
  ATTACK: "ATTACK",
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
  //@ts-ignore
  const emitter: Events = window.emitter;
  console.log("listening to", event);
  emitter.on(event, callback);
  return () => {
    console.log("removing listener from", event);
    emitter.off(event, callback);
  };
};

export const emit = <T extends keyof Signals>(
  event: T,
  ...args: Parameters<Signals[T]>
) => {
  //@ts-ignore
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
  SET_ROUTE: (route: string) => [events.SET_ROUTE, route],
  START_GAME: () => [events.START_GAME],
  PAUSE_GAME: () => [events.PAUSE_GAME],
  RESUME_GAME: () => [events.RESUME_GAME],
  PLAY_MUSIC: () => [events.PLAY_MUSIC],
  STOP_MUSIC: () => [events.STOP_MUSIC],
  SELECT_SQUAD_MOVE_START: (sqdId: string) => [
    events.SELECT_SQUAD_MOVE_START,
    sqdId,
  ],
  SELECT_SQUAD_MOVE_DONE: (sqdIds: string[], target: Vec2) => [
    events.SELECT_SQUAD_MOVE_DONE,
    sqdIds,
    target,
  ],
  SELECT_SQUAD_MOVE_CANCEL: (sqdId: string) => [
    events.SELECT_SQUAD_MOVE_CANCEL,
    sqdId,
  ],
  UNITS_SELECTED: (ids: string[]) => [events.UNITS_SELECTED, ids],
  CITIES_SELECTED: (ids: string[]) => [events.CITIES_SELECTED, ids],
  TOGGLE_DISPATCH_MODAL: (value: boolean) => [
    events.TOGGLE_DISPATCH_MODAL,
    value,
  ],
  TOGGLE_OPTIONS_MODAL: (value: boolean) => [
    events.TOGGLE_OPTIONS_MODAL,
    value,
  ],
  TOGGLE_LOAD_GAME_MODAL: (value: boolean) => [
    events.TOGGLE_LOAD_GAME_MODAL,
    value,
  ],
  TOGGLE_RECRUIT_MODAL: () => [events.TOGGLE_RECRUIT_MODAL],
  DISPATCH_SQUAD: (squadId: string) => [events.DISPATCH_SQUAD, squadId],
  TOGGLE_SQUADS_WINDOW: (value: boolean) => [
    events.TOGGLE_SQUADS_WINDOW,
    value,
  ],
  BATTLEGROUND_TICK: (tick: number) => [events.BATTLEGROUND_TICK, tick],
  ATTACK: (attacker: string, defender: string) => [
    events.ATTACK,
    attacker,
    defender,
  ],
  UPDATE_SQUAD: (squadId: string, sqd: Partial<Unit>) => [
    events.UPDATE_SQUAD,
    squadId,
    sqd,
  ],
  SQUAD_DESTROYED: (squadId: string) => [events.SQUAD_DESTROYED, squadId],
  FORCE_VICTORY: (force: string) => [events.FORCE_VICTORY, force],
  CAPTURE_CITY: (squadId: string, cityId: string) => [
    events.CAPTURE_CITY,
    squadId,
    cityId,
  ],
  SQUAD_WALKS_TOWARDS_CELL: (
    squadId: string,
    vec: Vec2,
    walked: number,
    total: number
  ) => [events.SQUAD_WALKS_TOWARDS_CELL, squadId, vec, walked, total],
  SQUAD_LEAVES_CELL: (squadId: string, vec: Vec2) => [
    events.SQUAD_LEAVES_CELL,
    squadId,
    vec,
  ],
  SQUAD_MOVED_INTO_CELL: (squadId: string, vec: Vec2) => [
    events.SQUAD_MOVED_INTO_CELL,
    squadId,
    vec,
  ],
  UPDATE_SQUAD_COUNTER: (count: number, vec: Vec2) => [
    events.UPDATE_SQUAD_COUNTER,
    count,
    vec,
  ],
  LOOKUP_PATH: (key: string, source: Vec2, target: Vec2) => [
    events.LOOKUP_PATH,
    key,
    source,
    target,
  ],
  PATH_FOUND: (key: string, path: Vec2[]) => [events.PATH_FOUND, key, path],
  CREATE_EMOTE: (id: string, key: string) => [events.CREATE_EMOTE, id, key],
  REMOVE_EMOTE: (squadId: string) => [events.REMOVE_EMOTE, squadId],
  FACE_DIRECTION: (squadId: string, direction: Direction) => [
    events.FACE_DIRECTION,
    squadId,
    direction,
  ],
  SQUAD_FINISHED_MOVE_ANIM: (squadId: string) => [
    events.SQUAD_FINISHED_MOVE_ANIM,
    squadId,
  ],
  CHANGE_DIRECTION: (key: string, vec: Vec2) => [
    events.CHANGE_DIRECTION,
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

