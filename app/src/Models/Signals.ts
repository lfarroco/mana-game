import Events from 'events'
import { Vec2 } from './Geometry'
import { Squad } from './Squad'
import { Direction } from './Direction'

export type Signals = {
	PAUSE_GAME: () => void
	RESUME_GAME: () => void
	SQUAD_SELECTED: (squadId: string) => void
	MULTIPLE_SQUADS_SELECTED: (squadIds: string[]) => void
	CITY_SELECTED: (cityId: string) => void
	SELECT_SQUAD_MOVE_START: (squadId: string) => void
	SELECT_SQUAD_MOVE_DONE: (squadId: string, target: Vec2) => void
	SELECT_SQUAD_MOVE_CANCEL: (squadId: string) => void
	TOGGLE_DISPATCH_MODAL: (value: boolean) => void
	TOGGLE_RECRUIT_MODAL: () => void
	DISPATCH_SQUAD: (squadId: string) => void
	TOGGLE_SQUADS_WINDOW: (value: boolean) => void,
	BATTLEGROUND_TICK: (tick: number) => void,
	// TODO: have a parent level for the system
	ATTACK: (attacker: string, defender: string) => any,
	UPDATE_SQUAD: (squadId: string, sqd: Partial<Squad>) => any,
	SQUAD_DESTROYED: (squadId: string) => any,
	FORCE_VICTORY: (force: string) => void,
	CAPTURE_CITY: (squadId: string, cityId: string) => void,
	SQUAD_WALKS_TOWARDS_CELL: (squadId: string, vec: Vec2) => void,
	SQUAD_LEAVES_CELL: (squadId: string, vec: Vec2) => void,
	SQUAD_MOVED_INTO_CELL: (squadId: string, vec: Vec2) => void,
	UPDATE_SQUAD_COUNTER: (count: number, vec: Vec2) => void, // TODO: not implemented yet
	LOOKUP_PATH: (key: string, source: Vec2, target: Vec2) => void,
	PATH_FOUND: (key: string, path: Vec2[]) => void,
	CREATE_EMOTE: (id: string, key: string) => void,
	REMOVE_EMOTE: (squadId: string) => void,
	FACE_DIRECTION: (squadId: string, direction: Direction) => void,
}

export type Operation = [keyof Signals, ...Parameters<Signals[keyof Signals]>]

export const events: { [key in keyof Signals]: keyof Signals } = {
	PAUSE_GAME: "PAUSE_GAME",
	RESUME_GAME: "RESUME_GAME",
	SELECT_SQUAD_MOVE_START: "SELECT_SQUAD_MOVE_START",
	SELECT_SQUAD_MOVE_DONE: "SELECT_SQUAD_MOVE_DONE",
	SELECT_SQUAD_MOVE_CANCEL: "SELECT_SQUAD_MOVE_CANCEL",
	SQUAD_SELECTED: "SQUAD_SELECTED",
	MULTIPLE_SQUADS_SELECTED: "MULTIPLE_SQUADS_SELECTED",
	CITY_SELECTED: "CITY_SELECTED",
	TOGGLE_DISPATCH_MODAL: "TOGGLE_DISPATCH_MODAL",
	TOGGLE_RECRUIT_MODAL: "TOGGLE_RECRUIT_MODAL",
	DISPATCH_SQUAD: "DISPATCH_SQUAD",
	TOGGLE_SQUADS_WINDOW: "TOGGLE_SQUADS_WINDOW",
	BATTLEGROUND_TICK: "BATTLEGROUND_TICK",
	ATTACK: "ATTACK",
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
}

export const listen = <T extends keyof Signals>(
	event: T,
	callback: Signals[T],
): (() => void) => {
	//@ts-ignore
	const emitter: Events = window.emitter;
	console.log("listening to", event)
	emitter.on(event, callback)
	return () => {
		console.log("removing listener from", event)
		emitter.off(event, callback)
	}
}

export const emit = <T extends keyof Signals>(
	event: T,
	...args: Parameters<Signals[T]>
) => {
	//@ts-ignore
	const emitter: Events = window.emitter;
	console.log(
		`emit("${event}", ...${JSON.stringify(args)})`
	)
	emitter.emit(event, ...args)
}

export const emit_ = <T extends keyof Signals>(
	event: T,
	...args: Parameters<Signals[T]>
) => {
	return () => emit(event, ...args)
}

export const sequence = (operations: Operation[]) => {
	operations.forEach(([event, ...args]) => {
		emit(event, ...args)
	})
}


// example usage:
// listeners([
// 	[ "A", ()=>{ do stuff}],
// 	[ "B", ()=>{ do stuff}],
// ])
export const listeners = <T extends keyof Signals>(
	listeners: [T, Signals[T]][]
) => {
	listeners.forEach(([event, callback]) => {
		listen(event, callback)
	})
}

export const operations: { [key in keyof Signals]: (...args: Parameters<Signals[key]>) => Operation } = {
	PAUSE_GAME: () => [events.PAUSE_GAME],
	RESUME_GAME: () => [events.RESUME_GAME],
	SELECT_SQUAD_MOVE_START: (sqdId: string) => [events.SELECT_SQUAD_MOVE_START, sqdId],
	SELECT_SQUAD_MOVE_DONE: (sqdId: string, target: Vec2) => [events.SELECT_SQUAD_MOVE_DONE, sqdId, target],
	SELECT_SQUAD_MOVE_CANCEL: (sqdId: string) => [events.SELECT_SQUAD_MOVE_CANCEL, sqdId],
	SQUAD_SELECTED: (squadId: string) => [events.SQUAD_SELECTED, squadId],
	MULTIPLE_SQUADS_SELECTED: (squadIds: string[]) => [events.MULTIPLE_SQUADS_SELECTED, squadIds],
	CITY_SELECTED: (cityId: string) => [events.CITY_SELECTED, cityId],
	TOGGLE_DISPATCH_MODAL: (value: boolean) => [events.TOGGLE_DISPATCH_MODAL, value],
	TOGGLE_RECRUIT_MODAL: () => [events.TOGGLE_RECRUIT_MODAL],
	DISPATCH_SQUAD: (squadId: string) => [events.DISPATCH_SQUAD, squadId],
	TOGGLE_SQUADS_WINDOW: (value: boolean) => [events.TOGGLE_SQUADS_WINDOW, value],
	BATTLEGROUND_TICK: (tick: number) => [events.BATTLEGROUND_TICK, tick],
	ATTACK: (attacker: string, defender: string) => [events.ATTACK, attacker, defender],
	UPDATE_SQUAD: (squadId: string, sqd: Partial<Squad>) => {

		if (Object.keys(sqd).length !== 1) throw new Error("UPDATE_SQUAD only accepts one key to be updated")

		return [events.UPDATE_SQUAD, squadId, sqd]

	},
	SQUAD_DESTROYED: (squadId: string) => [events.SQUAD_DESTROYED, squadId],
	FORCE_VICTORY: (force: string) => [events.FORCE_VICTORY, force],
	CAPTURE_CITY: (squadId: string, cityId: string) => [events.CAPTURE_CITY, squadId, cityId],
	SQUAD_WALKS_TOWARDS_CELL: (squadId: string, vec: Vec2) => [events.SQUAD_WALKS_TOWARDS_CELL, squadId, vec],
	SQUAD_LEAVES_CELL: (squadId: string, vec: Vec2) => [events.SQUAD_LEAVES_CELL, squadId, vec],
	SQUAD_MOVED_INTO_CELL: (squadId: string, vec: Vec2) => [events.SQUAD_MOVED_INTO_CELL, squadId, vec],
	UPDATE_SQUAD_COUNTER: (count: number, vec: Vec2) => [events.UPDATE_SQUAD_COUNTER, count, vec],
	LOOKUP_PATH: (key: string, source: Vec2, target: Vec2) => [events.LOOKUP_PATH, key, source, target],
	PATH_FOUND: (key: string, path: Vec2[]) => [events.PATH_FOUND, key, path],
	CREATE_EMOTE: (id: string, key: string) => [events.CREATE_EMOTE, id, key],
	REMOVE_EMOTE: (squadId: string) => [events.REMOVE_EMOTE, squadId],
	FACE_DIRECTION: (squadId: string, direction: Direction) => [events.FACE_DIRECTION, squadId, direction],
}

//@ts-ignore
window.emit = emit

export function foldMap<A>(data: A[], fn: (a: A) => Operation[]): Operation[] {
	return data.reduce((ops, item) => {

		const res = fn(item);

		return ops.concat(res);

	}, [] as Operation[]);
}