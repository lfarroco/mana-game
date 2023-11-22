import events from 'events'

export type Events = {
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
	SELECT_SQUAD_MOVE_START: "SELECT_SQUAD_MOVE_START",
	SELECT_SQUAD_MOVE_DONE: "SELECT_SQUAD_MOVE_DONE",
	SELECT_SQUAD_MOVE_CANCEL: "SELECT_SQUAD_MOVE_CANCEL",
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
	console.log("emiting", event, args)
	emitter.emit(event, ...args)
}
