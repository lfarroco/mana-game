import Events from "events";
import { Vec2 } from "./Geometry";
import { GameData } from "./State";

let events: any[] = [];
//@ts-ignore
window.events = events;

// TODO: purge events that are called just once
export type Signals = {
  SET_ROUTE: (route: string) => void;

  TURN_START: () => void;
  TURN_END: () => void;

  WAVE_FINISHED: () => void;

  PAUSE_GAME: () => void;
  RESUME_GAME: () => void;

  PLAY_MUSIC: () => void;
  STOP_MUSIC: () => void;

  SAVE_GAME: (gameData: GameData, name: string) => void;
  LOAD_GAME: (key: string) => void;
  DELETE_GAME: (key: string) => void;

  BATTLEGROUND_STARTED: () => void;

  WAVE_START: (unitId: string) => void;

  UNIT_SELECTED: (unitId: string) => void;
  UNIT_DESELECTED: (unitId: string) => void;

  HIGHLIGHT_UNIT: (unitId: string, color: number) => void;
  STOP_HIGHLIGHT_UNIT: (unitId: string) => void;

  TOGGLE_DISPATCH_MODAL: (value: boolean) => void;
  TOGGLE_OPTIONS_MODAL: (value: boolean) => void;
  TOGGLE_LOAD_GAME_MODAL: (value: boolean) => void;
  TOGGLE_SAVE_GAME_MODAL: (value: boolean) => void;
  TOGGLE_RECRUIT_MODAL: () => void;
  BATTLEGROUND_TICK: (tick: number) => void;

  DESTINATION_GOAL_TO: (unitId: string, target: Vec2) => void;

  UNIT_CASTS_SPECIAL: (unitId: string, specialId: string) => any;

  ADD_STATUS: (unitId: string, status: string, duration: number) => any;
  END_STATUS: (unitId: string, status: string) => any;
  HEAL_UNIT: (unitId: string, amount: number) => any;
  FORCE_VICTORY: (force: string) => void;

  MOVEMENT_STARTED: (unitId: string, vec: Vec2) => void;
  MOVEMENT_FINISHED: (unitId: string, vec: Vec2) => void;

  DISPLAY_EMOTE: (id: string, key: string) => void;
  HIDE_EMOTE: (unitId: string) => void;
};

export type Operation = [keyof Signals, ...Parameters<Signals[keyof Signals]>];

export const signals: { [key in keyof Signals]: keyof Signals } = {
  SET_ROUTE: "SET_ROUTE",
  PAUSE_GAME: "PAUSE_GAME",
  RESUME_GAME: "RESUME_GAME",
  TURN_START: "TURN_START",
  TURN_END: "TURN_END",
  PLAY_MUSIC: "PLAY_MUSIC",
  STOP_MUSIC: "STOP_MUSIC",
  SAVE_GAME: "SAVE_GAME",
  LOAD_GAME: "LOAD_GAME",
  DELETE_GAME: "DELETE_GAME",
  BATTLEGROUND_STARTED: "BATTLEGROUND_STARTED",
  WAVE_START: "WAVE_START",
  WAVE_FINISHED: "WAVE_FINISHED",
  UNIT_SELECTED: "UNIT_SELECTED",
  UNIT_DESELECTED: "UNIT_DESELECTED",
  UNIT_CASTS_SPECIAL: "UNIT_CASTS_SPECIAL",
  TOGGLE_DISPATCH_MODAL: "TOGGLE_DISPATCH_MODAL",
  TOGGLE_OPTIONS_MODAL: "TOGGLE_OPTIONS_MODAL",
  TOGGLE_LOAD_GAME_MODAL: "TOGGLE_LOAD_GAME_MODAL",
  TOGGLE_SAVE_GAME_MODAL: "TOGGLE_SAVE_GAME_MODAL",
  TOGGLE_RECRUIT_MODAL: "TOGGLE_RECRUIT_MODAL",
  BATTLEGROUND_TICK: "BATTLEGROUND_TICK",

  HIGHLIGHT_UNIT: "HIGHLIGHT_UNIT",
  STOP_HIGHLIGHT_UNIT: "STOP_HIGHLIGHT_UNIT",

  DESTINATION_GOAL_TO: "DESTINATION_GOAL_TO",
  ADD_STATUS: "ADD_STATUS",
  END_STATUS: "END_STATUS",
  HEAL_UNIT: "HEAL_UNIT",
  FORCE_VICTORY: "FORCE_VICTORY",
  MOVEMENT_STARTED: "MOVEMENT_STARTED",
  MOVEMENT_FINISHED: "MOVEMENT_FINISHED",
  DISPLAY_EMOTE: "DISPLAY_EMOTE",
  HIDE_EMOTE: "HIDE_EMOTE",
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
  events.push([event, ...args]);
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