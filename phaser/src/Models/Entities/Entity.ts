import { getState } from "@Models/State";
import cloudsBg from "@Scenes/Title/entities/cloudsBg";
import logo from "@Scenes/Title/entities/logo";

export type Entity = {
	key: string,
	create: () => any;
	update?: () => void;
	destroy?: () => void;
};

export const entitiesIndex: Record<string, Entity> = {
	clouds_bg: cloudsBg,
	logo: logo
}

export function createEntity(key: string) {

	const scene = getState().currentScene;

	const spec = entitiesIndex[key];

	if (spec) {
		const entity = spec.create();

		scene.data.set(key, entity);

	} else {
		throw new Error(`Entity type with key ${key} not found`);
	}

}