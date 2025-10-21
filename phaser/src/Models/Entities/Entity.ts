import { getState } from "@Models/State";

export type Entity<T> = {
	key: string,
	create: () => T;
	update?: () => void;
	// only necessary for non-game objects
	onDestroy?: (obj: T, handler: () => void) => void;
};

// export const events = [
// 	hello,
// 	log,
// 	start_game,
// 	return_to_title,
// 	switch_tab,
// 	render_tab,
// 	update_music_volume,
// 	update_sound_volume,
// 	toggle_sound_enabled,
// 	toggle_music_enabled
// ].reduce((xs, x) => ({ ...xs, [x.key]: x }), {} as { [key: string]: GameEvent<any> })

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

export type EventConnection<T> = {
	ev: GameEvent<T> | string
	handler: GameEvent<T>;
	arg?: T
};

export type SceneSpec<State> = {
	name: string;
	create: (Entity<any>)[];
	events: EventConnection<any>[];
	input: { ev: (GameEvent<any> | string), handler: GameEvent<any>, arg?: any }[];
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
		eventIndex: { [key: string]: GameEvent<any> }

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
				const key = typeof event.ev === 'string' ? event.ev : event.ev.key;
				console.log(`  ${key} -> ${event.handler.key}`)
				this.events.on(key, (payload: any) => {
					console.log(`[SCENE] ${key} -> ${event.handler.key}`)
					if (event.arg)
						event.handler.handler(event.arg);
					else
						event.handler.handler(payload)
				});
			})

			console.log("Registering input events...")

			this.spec.input.forEach((event) => {
				const key = typeof event.ev === 'string' ? event.ev : event.ev.key;
				console.log(`  ${key} -> ${event.handler.key}`)
				if (key.startsWith("keydown-"))
					this.input.keyboard?.on(key, () => {
						console.log(`[INPUT] ${key} -> ${event.handler.key}`)
						if (event.arg)
							event.handler.handler(event.arg);
						else
							event.handler.handler({});
					});
			})
		}
	}
}