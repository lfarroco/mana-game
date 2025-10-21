import { getState } from "@Models/State";
import start_game from "@Scenes/Title/events/start_game";
import hello from "@Events/hello";
import return_to_title from "@Scenes/Options/events/return_to_title";
import switch_tab from "@Scenes/Options/events/switch_tab";
import log from "@Events/log";
import render_tab from "@Scenes/Options/events/render_tab";
import update_music_volume from "@Scenes/Options/events/update_music_volume";
import update_sound_volume from "@Scenes/Options/events/update_sound_volume";
import toggle_sound_enabled from "@Scenes/Options/events/toggle_sound_enabled";
import toggle_music_enabled from "@Scenes/Options/events/toggle_music_enabled";

export type Entity<T> = {
	key: string,
	create: () => T;
	update?: () => void;
	// only necessary for non-game objects
	onDestroy?: (obj: T, handler: () => void) => void;
};

export const events = [
	hello,
	log,
	start_game,
	return_to_title,
	switch_tab,
	render_tab,
	update_music_volume,
	update_sound_volume,
	toggle_sound_enabled,
	toggle_music_enabled
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

export type SceneSpec<State> = {
	name: string;
	create: (Entity<any>)[];
	events: { key: string, handler: string, arg?: any }[];
	input: { key: string, handler: string, arg?: any }[];
	state: State
}

export const getSceneState = <T>(): T => {
	// TODO:
	// it should to be possible to use getSceneByName instead

	const scene = getState().currentScene;
	//@ts-ignore
	return scene.state as T;
}


export const SceneFromSpec = <State>(spec: SceneSpec<State>) => {
	return class extends Phaser.Scene {
		spec: SceneSpec<State>;
		state: State;
		constructor() {
			super(spec.name);
			this.spec = spec;
			this.state = spec.state;
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
					console.log(`[SCENE] ${event.key} -> ${event.handler}`)
					if (event.arg)
						//@ts-ignore
						ev.handler(event.arg);
					else
						//@ts-ignore
						ev.handler(payload)
				});
			})

			console.log("Registering input events...")

			this.spec.input.forEach((event) => {
				console.log(`  ${event.key} -> ${event.handler}`)
				if (event.key.startsWith("keydown-"))
					this.input.keyboard?.on(event.key, () => {
						const ev = events[event.handler];
						console.log(`[INPUT] ${event.key} -> ${event.handler}`)
						if (event.arg)
							//@ts-ignore
							ev.handler(event.arg);
						else
							//@ts-ignore
							ev.handler({});
					});
			})
		}
	}
}