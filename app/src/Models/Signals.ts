import events from 'events'
import { WindowVec } from './Misc'

export type Signals = {
	PAUSE_PHYSICS: {
		callback: () => void
	},
	RESUME_PHYSICS: {
		callback: () => void
	},
	SQUAD_SELECTED: {
		callback: (squadId: string) => void
	},
	CITY_SELECTED: {
		callback: (cityId: string) => void
	},
	SELECT_SQUAD_MOVE_START: {
		callback: (squadId: string) => void
	},
	SELECT_SQUAD_MOVE_DONE: {
		callback: (squadId: string, target: WindowVec) => void
	},
	SELECT_SQUAD_MOVE_CANCEL: {
		callback: (squadId: string) => void
	},
	TOGGLE_DISPATCH_MODAL: {
		callback: (value: boolean) => void
	},
	DISPATCH_SQUAD: {
		callback: (squadId: string, cityId: string) => void
	}
}

export const index: { [key in keyof Signals]: keyof Signals } = {
	PAUSE_PHYSICS: "PAUSE_PHYSICS",
	RESUME_PHYSICS: "RESUME_PHYSICS",
	SELECT_SQUAD_MOVE_START: "SELECT_SQUAD_MOVE_START",
	SELECT_SQUAD_MOVE_DONE: "SELECT_SQUAD_MOVE_DONE",
	SELECT_SQUAD_MOVE_CANCEL: "SELECT_SQUAD_MOVE_CANCEL",
	SQUAD_SELECTED: "SQUAD_SELECTED",
	CITY_SELECTED: "CITY_SELECTED",
	TOGGLE_DISPATCH_MODAL: "TOGGLE_DISPATCH_MODAL",
	DISPATCH_SQUAD: "DISPATCH_SQUAD",
}

export const listen = <T extends keyof Signals>(
	event: T,
	callback: Signals[T]["callback"],
): (() => void) => {
	//@ts-ignore
	const emitter: events = window.emitter;
	console.log("listening to", event)
	emitter.on(event, callback)
	return () => {
		console.log("removing listener from", event)
		emitter.off(event, callback)
	}
}

export const emit = <T extends keyof Signals>(
	event: T,
	...args: Parameters<Signals[T]["callback"]>
) => {
	//@ts-ignore
	const emitter: events = window.emitter;
	console.log(
		event, ...args
	)
	emitter.emit(event, ...args)
}

// example usage:
// listeners(emitter,[
// 	[ "A", ()=>{ do stuff}],
// 	[ "B", ()=>{ do stuff}],
// ])
export const listeners = <T extends keyof Signals>(
	listeners: [T, Signals[T]["callback"]][]
) => {
	listeners.forEach(([event, callback]) => {
		listen(event, callback)
	})
}
