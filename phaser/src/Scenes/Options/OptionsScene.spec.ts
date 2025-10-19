import { SceneSpec } from "@Models/Entities/Entity";

export default {
	name: "OptionsScene",
	create: [

	],
	events: [
		["create", {
			handler: () => {
				console.log("hello!!")
			}
		}]
	],
	input: [
	],
} as SceneSpec;

