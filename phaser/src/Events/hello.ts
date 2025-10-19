import { GameEvent } from "@Models/Entities/Entity";

function handler({ }) {
	console.log("hello!!!")
}

export default {
	key: 'events/hello',
	handler
} as GameEvent<any>