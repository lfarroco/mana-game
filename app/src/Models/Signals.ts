import Events from 'events'
import { WindowVec } from './Misc'

export type Signals = {
	PAUSE_PHYSICS: () => void
	RESUME_PHYSICS: () => void
	SQUAD_SELECTED: (squadId: string) => void
	CITY_SELECTED: (cityId: string) => void
	SELECT_SQUAD_MOVE_START: (squadId: string) => void
	SELECT_SQUAD_MOVE_DONE: (squadId: string, target: WindowVec) => void
	SELECT_SQUAD_MOVE_CANCEL: (squadId: string) => void
	TOGGLE_DISPATCH_MODAL: (value: boolean) => void
	TOGGLE_RECRUIT_MODAL: () => void
	TOGGLE_SQUAD_DETAILS_MODAL: (value: boolean) => void
	DISPATCH_SQUAD: (squadId: string, cityId: string) => void
	SQUADS_COLLIDED: (squadId1: string, squadId2: string) => void
	SKIRMISH_STARTED: (squadId1: string, squadId2: string) => void
	SKIRMISH_ENDED: (winner: string, loser: string) => void,
	TOGGLE_UNITS_WINDOW: (value: boolean) => void,
	TOGGLE_SQUADS_WINDOW: (value: boolean) => void,
	SET_UNIT_DETAILS_MODAL: (id: string | null) => void,
}

export const events: { [key in keyof Signals]: keyof Signals } = {
	PAUSE_PHYSICS: "PAUSE_PHYSICS",
	RESUME_PHYSICS: "RESUME_PHYSICS",
	SELECT_SQUAD_MOVE_START: "SELECT_SQUAD_MOVE_START",
	SELECT_SQUAD_MOVE_DONE: "SELECT_SQUAD_MOVE_DONE",
	SELECT_SQUAD_MOVE_CANCEL: "SELECT_SQUAD_MOVE_CANCEL",
	SQUAD_SELECTED: "SQUAD_SELECTED",
	CITY_SELECTED: "CITY_SELECTED",
	TOGGLE_DISPATCH_MODAL: "TOGGLE_DISPATCH_MODAL",
	TOGGLE_RECRUIT_MODAL: "TOGGLE_RECRUIT_MODAL",
	DISPATCH_SQUAD: "DISPATCH_SQUAD",
	SQUADS_COLLIDED: "SQUADS_COLLIDED",
	TOGGLE_SQUAD_DETAILS_MODAL: "TOGGLE_SQUAD_DETAILS_MODAL",
	SKIRMISH_STARTED: "SKIRMISH_STARTED",
	SKIRMISH_ENDED: "SKIRMISH_ENDED",
	TOGGLE_UNITS_WINDOW: "TOGGLE_UNITS_WINDOW",
	TOGGLE_SQUADS_WINDOW: "TOGGLE_SQUADS_WINDOW",
	SET_UNIT_DETAILS_MODAL: "SET_UNIT_DETAILS_MODAL",
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
// listeners(emitter,[
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

//@ts-ignore
window.emit = emit