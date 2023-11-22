import events from 'events'

export type Events = {
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
		callback: (squadId: string, target: { x: number, y: number }) => void
	},
	SELECT_SQUAD_MOVE_CANCEL: {
		callback: (squadId: string) => void
	},
}

export const index: { [key in keyof Events]: keyof Events } = {
	PAUSE_PHYSICS: "PAUSE_PHYSICS",
	RESUME_PHYSICS: "RESUME_PHYSICS",
	SELECT_SQUAD_MOVE_START: "SELECT_SQUAD_MOVE_START",
	SELECT_SQUAD_MOVE_DONE: "SELECT_SQUAD_MOVE_DONE",
	SELECT_SQUAD_MOVE_CANCEL: "SELECT_SQUAD_MOVE_CANCEL",
	SQUAD_SELECTED: "SQUAD_SELECTED",
	CITY_SELECTED: "CITY_SELECTED",
}

export const listen = <T extends keyof Events>(
	emitter: events,
	event: T,
	callback: Events[T]["callback"],
): (() => void) => {
	console.log("listening to", event)
	emitter.on(event, callback)
	return () => {
		console.log("removing listener from", event)
		emitter.off(event, callback)
	}
}

export const emit = <T extends keyof Events>(
	emitter: events,
	event: T,
	...args: Parameters<Events[T]["callback"]>
) => {
	console.table({ event, args })
	emitter.emit(event, ...args)
}

// example usage:
// listeners(emitter,[
// 	[ "A", ()=>{ do stuff}],
// 	[ "B", ()=>{ do stuff}],
// ])
export const listeners = <T extends keyof Events>(
	emitter: events,
	listeners: [T, Events[T]["callback"]][]
) => {
	listeners.forEach(([event, callback]) => {
		listen(emitter, event, callback)
	})
}
