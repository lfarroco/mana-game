import Events from 'events'
import { BoardVec } from './Misc'
import { Squad } from './Squad'
import * as IORef from "fp-ts/lib/IORef";
import * as IO from "fp-ts/lib/IO";

export type Signals = {
	PAUSE_PHYSICS: () => void
	RESUME_PHYSICS: () => void
	SQUAD_SELECTED: (squadId: string) => void
	MULTIPLE_SQUADS_SELECTED: (squadIds: string[]) => void
	CITY_SELECTED: (cityId: string) => void
	SELECT_SQUAD_MOVE_START: (squadId: string) => void
	SELECT_SQUAD_MOVE_DONE: (squadId: string, target: BoardVec) => void
	SELECT_SQUAD_MOVE_CANCEL: (squadId: string) => void
	TOGGLE_DISPATCH_MODAL: (value: boolean) => void
	TOGGLE_RECRUIT_MODAL: () => void
	TOGGLE_SQUAD_DETAILS_MODAL: (value: boolean) => void
	DISPATCH_SQUAD: (squadId: string, cityId: string) => void
	SKIRMISH_STARTED: (squadId1: string, squadId2: string) => void
	SKIRMISH_ENDED: (winner: string, loser: string) => void,
	TOGGLE_UNITS_WINDOW: (value: boolean) => void,
	TOGGLE_SQUADS_WINDOW: (value: boolean) => void,
	TOGGLE_ENGAGEMENT_WINDOW: (value: boolean, id: string) => void,
	SET_UNIT_DETAILS_MODAL: (id: string | null) => void,
	BATTLEGROUND_TICK: (tick: number) => void,
	// TODO: have a parent level for the system
	ENGAGEMENT_START: (attacker: string, targetCell: BoardVec) => any,
	UPDATE_SQUAD: (squadId: string, sqd: Partial<Squad>) => any,
	SQUAD_DESTROYED: (squadId: string) => any,
	FORCE_VICTORY: (force: string) => void,
	CAPTURE_CITY: (squadId: string, cityId: string) => void,
	FINISH_ENGAGEMENT: (id: string) => void,
	SQUAD_WALKS_TOWARDS_CELL: (squadId: string, vec: BoardVec) => void,
	SQUAD_LEAVES_CELL: (squadId: string, vec: BoardVec) => void,
	SQUAD_MOVED_INTO_CELL: (squadId: string, vec: BoardVec) => void,
	UPDATE_SQUAD_COUNTER: (count: number, vec: BoardVec) => void, // TODO: not implemented yet
	LOOKUP_PATH: (key: string, source: BoardVec, target: BoardVec) => void,
	PATH_FOUND: (key: string, path: BoardVec[]) => void,
}

export type Operation = [keyof Signals, ...Parameters<Signals[keyof Signals]>]

export const adddOperation = (operations: IO.IO<IORef.IORef<Operation[]>>, op: Operation) => IO.flatMap(
	operations,
	ref => ref.modify(ops => [...ops, op])
)()

export const events: { [key in keyof Signals]: keyof Signals } = {
	PAUSE_PHYSICS: "PAUSE_PHYSICS",
	RESUME_PHYSICS: "RESUME_PHYSICS",
	SELECT_SQUAD_MOVE_START: "SELECT_SQUAD_MOVE_START",
	SELECT_SQUAD_MOVE_DONE: "SELECT_SQUAD_MOVE_DONE",
	SELECT_SQUAD_MOVE_CANCEL: "SELECT_SQUAD_MOVE_CANCEL",
	SQUAD_SELECTED: "SQUAD_SELECTED",
	MULTIPLE_SQUADS_SELECTED: "MULTIPLE_SQUADS_SELECTED",
	CITY_SELECTED: "CITY_SELECTED",
	TOGGLE_DISPATCH_MODAL: "TOGGLE_DISPATCH_MODAL",
	TOGGLE_RECRUIT_MODAL: "TOGGLE_RECRUIT_MODAL",
	DISPATCH_SQUAD: "DISPATCH_SQUAD",
	TOGGLE_SQUAD_DETAILS_MODAL: "TOGGLE_SQUAD_DETAILS_MODAL",
	SKIRMISH_STARTED: "SKIRMISH_STARTED",
	SKIRMISH_ENDED: "SKIRMISH_ENDED",
	TOGGLE_UNITS_WINDOW: "TOGGLE_UNITS_WINDOW",
	TOGGLE_SQUADS_WINDOW: "TOGGLE_SQUADS_WINDOW",
	SET_UNIT_DETAILS_MODAL: "SET_UNIT_DETAILS_MODAL",
	BATTLEGROUND_TICK: "BATTLEGROUND_TICK",
	ENGAGEMENT_START: "ENGAGEMENT_START",
	UPDATE_SQUAD: "UPDATE_SQUAD",
	SQUAD_DESTROYED: "SQUAD_DESTROYED",
	FORCE_VICTORY: "FORCE_VICTORY",
	CAPTURE_CITY: "CAPTURE_CITY",
	TOGGLE_ENGAGEMENT_WINDOW: "TOGGLE_ENGAGEMENT_WINDOW",
	FINISH_ENGAGEMENT: "FINISH_ENGAGEMENT",
	SQUAD_WALKS_TOWARDS_CELL: "SQUAD_WALKS_TOWARDS_CELL",
	SQUAD_LEAVES_CELL: "SQUAD_LEAVES_CELL",
	SQUAD_MOVED_INTO_CELL: "SQUAD_MOVED_INTO_CELL",
	UPDATE_SQUAD_COUNTER: "UPDATE_SQUAD_COUNTER",
	LOOKUP_PATH: "LOOKUP_PATH",
	PATH_FOUND: "PATH_FOUND",
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
	PAUSE_PHYSICS: () => [events.PAUSE_PHYSICS],
	RESUME_PHYSICS: () => [events.RESUME_PHYSICS],
	SELECT_SQUAD_MOVE_START: (sqdId: string) => [events.SELECT_SQUAD_MOVE_START, sqdId],
	SELECT_SQUAD_MOVE_DONE: (sqdId: string, target: BoardVec) => [events.SELECT_SQUAD_MOVE_DONE, sqdId, target],
	SELECT_SQUAD_MOVE_CANCEL: (sqdId: string) => [events.SELECT_SQUAD_MOVE_CANCEL, sqdId],
	SQUAD_SELECTED: (squadId: string) => [events.SQUAD_SELECTED, squadId],
	MULTIPLE_SQUADS_SELECTED: (squadIds: string[]) => [events.MULTIPLE_SQUADS_SELECTED, squadIds],
	CITY_SELECTED: (cityId: string) => [events.CITY_SELECTED, cityId],
	TOGGLE_DISPATCH_MODAL: (value: boolean) => [events.TOGGLE_DISPATCH_MODAL, value],
	TOGGLE_RECRUIT_MODAL: () => [events.TOGGLE_RECRUIT_MODAL],
	DISPATCH_SQUAD: (squadId: string, cityId: string) => [events.DISPATCH_SQUAD, squadId, cityId],
	TOGGLE_SQUAD_DETAILS_MODAL: (value: boolean) => [events.TOGGLE_SQUAD_DETAILS_MODAL, value],
	SKIRMISH_STARTED: (squadId1: string, squadId2: string) => [events.SKIRMISH_STARTED, squadId1, squadId2],
	SKIRMISH_ENDED: (winner: string, loser: string) => [events.SKIRMISH_ENDED, winner, loser],
	TOGGLE_UNITS_WINDOW: (value: boolean) => [events.TOGGLE_UNITS_WINDOW, value],
	TOGGLE_SQUADS_WINDOW: (value: boolean) => [events.TOGGLE_SQUADS_WINDOW, value],
	SET_UNIT_DETAILS_MODAL: (id: string | null) => [events.SET_UNIT_DETAILS_MODAL, id],
	BATTLEGROUND_TICK: (tick: number) => [events.BATTLEGROUND_TICK, tick],
	ENGAGEMENT_START: (attacker: string, targetCell: BoardVec) => [events.ENGAGEMENT_START, attacker, targetCell],
	UPDATE_SQUAD: (squadId: string, sqd: Partial<Squad>) => {

		if (Object.keys(sqd).length !== 1) throw new Error("UPDATE_SQUAD only accepts one key to be updated")

		return [events.UPDATE_SQUAD, squadId, sqd]

	},
	SQUAD_DESTROYED: (squadId: string) => [events.SQUAD_DESTROYED, squadId],
	FORCE_VICTORY: (force: string) => [events.FORCE_VICTORY, force],
	CAPTURE_CITY: (squadId: string, cityId: string) => [events.CAPTURE_CITY, squadId, cityId],
	TOGGLE_ENGAGEMENT_WINDOW: (value: boolean, id: string) => [events.TOGGLE_ENGAGEMENT_WINDOW, value, id],
	FINISH_ENGAGEMENT: (id: string) => [events.FINISH_ENGAGEMENT, id],
	SQUAD_WALKS_TOWARDS_CELL: (squadId: string, vec: BoardVec) => [events.SQUAD_WALKS_TOWARDS_CELL, squadId, vec],
	SQUAD_LEAVES_CELL: (squadId: string, vec: BoardVec) => [events.SQUAD_LEAVES_CELL, squadId, vec],
	SQUAD_MOVED_INTO_CELL: (squadId: string, vec: BoardVec) => [events.SQUAD_MOVED_INTO_CELL, squadId, vec],
	UPDATE_SQUAD_COUNTER: (count: number, vec: BoardVec) => [events.UPDATE_SQUAD_COUNTER, count, vec],
	LOOKUP_PATH: (key: string, source: BoardVec, target: BoardVec) => [events.LOOKUP_PATH, key, source, target],
	PATH_FOUND: (key: string, path: BoardVec[]) => [events.PATH_FOUND, key, path],
}

//@ts-ignore
window.emit = emit