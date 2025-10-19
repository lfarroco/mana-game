import { getState } from "@Models/State";
import clouds_bg from "../../Entities/clouds_bg";
import exit_button from "@Scenes/Title/entities/exit_button";
import go_fullscreen_button from "@Scenes/Title/entities/go_fullscreen_button";
import logo from "@Scenes/Title/entities/logo";
import options_button from "@Scenes/Title/entities/options_button";
import start_game_button from "@Scenes/Title/entities/start_game_button";
import start_game from "@Scenes/Title/events/start_game";
import hello from "@Scenes/Title/events/hello";

export type Entity<T> = {
	key: string,
	create: () => T;
	update?: () => void;
	// only necessary for non-game objects
	onDestroy?: (obj: T, handler: () => void) => void;
};

export const entities = [
	clouds_bg,
	logo,
	start_game_button,
	options_button,
	go_fullscreen_button,
	exit_button
].reduce((xs, x) => ({ ...xs, [x.key]: x }), {} as { [key: string]: Entity<any> })

export const events = [
	start_game,
	hello
].reduce((xs, x) => ({ ...xs, [x.key]: x }), {} as { [key: string]: GameEvent<any> })

export function registerEntity(entity: Entity<any>) {

	const scene = getState().currentScene;

	const instance = entity.create();

	console.log("Creating entity", entity, instance)

	scene.data.set(entity.key, instance);

	const onDestroy = () => {
		scene.data.remove(entity.key);
	}

	if (entity.onDestroy) {
		entity.onDestroy(instance, onDestroy);
	} else {
		(instance as Phaser.GameObjects.GameObject).on("destroy", onDestroy);
	}

}

export type GameEvent<T> = {
	key: string;
	handler: (arg: T) => void;
};

export type SceneSpec = {
	name: string;
	create: (Entity<any>)[];
	events: { key: string, handler: string }[];
	input: { key: string, handler: string }[];
}

export const SceneFromSpec = (spec: SceneSpec) => {
	return class extends Phaser.Scene {
		spec: SceneSpec;
		constructor() {
			super(spec.name);
			this.spec = spec;
			//@ts-ignore
			window[spec.name] = this;
		}

		create() {
			getState().currentScene = this;

			this.spec.create.forEach(registerEntity)

			//AudioManager.playMusic('music_ageofdisjunction');

			console.log("Registering scene events...")

			this.spec.events.forEach((event) => {
				console.log(`  ${event.key} -> ${event.handler}`)
				this.events.on(event.key, (payload: any) => {
					const ev = events[event.handler];
					ev.handler(payload);
				});
			})

			console.log("Registering input events...")

			this.spec.input.forEach((event) => {
				console.log(`  ${event.key} -> ${event.handler}`)
				if (event.key.startsWith("keydown-"))
					this.input.keyboard?.on(event.key, () => {
						const ev = events[event.handler];
						ev.handler({});
					});
			})
		}
	}
}