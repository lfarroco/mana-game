import { getState } from "@Models/State";
import clouds_bg from "@Scenes/Title/entities/clouds_bg";
import exit_button from "@Scenes/Title/entities/exit_button";
import go_fullscreen_button from "@Scenes/Title/entities/go_fullscreen_button";
import logo from "@Scenes/Title/entities/logo";
import options_button from "@Scenes/Title/entities/options_button";
import start_game_button from "@Scenes/Title/entities/start_game_button";
import start_game from "@Scenes/Title/events/start_game";

export type Entity = {
	key: string,
	create: () => any;
	update?: () => void;
	destroy?: () => void;
};

export const entities = [
	clouds_bg,
	logo,
	start_game_button,
	options_button,
	go_fullscreen_button,
	exit_button
].reduce((xs, x) => ({ ...xs, [x.key]: x }), {} as { [key: string]: Entity })

export const events = [
	start_game
].reduce((xs, x) => ({ ...xs, [x.key]: x }), {} as { [key: string]: GameEvent })

export function registerEntity(entity: Entity) {

	const scene = getState().currentScene;

	const instance = entity.create();

	scene.data.set(entity.key, instance);

}

export type GameEvent = {
	key: string;
	handler: () => void;
};
