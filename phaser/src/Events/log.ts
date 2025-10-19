import { GameEvent } from "@Models/Entities/Entity";

function handler(arg: any) {
	console.log(arg)
}

export default {
	key: 'events/log',
	handler
} as GameEvent<any>