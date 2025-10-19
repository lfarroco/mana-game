import { SceneSpec } from "@Models/Entities/Entity";
import cloudsBg from "./entities/clouds_bg";
import go_fullscreen_button from "./entities/go_fullscreen_button";
import logo from "./entities/logo";
import options_button from "./entities/options_button";
import start_game_button from "./entities/start_game_button";
import start_game from "./events/start_game";
import exit_button from "./entities/exit_button";

export default {
	name: "TitleScene",
	create: [
		cloudsBg,
		logo,
		start_game_button,
		options_button,
		go_fullscreen_button,
		exit_button
	],
	events: [
		["create", {
			handler: () => {
				console.log("hello!!")
			}
		}]
	],
	input: [
		["keydown-ENTER", start_game]
	],
} as SceneSpec;

