import cloudsBg from "@Scenes/Title/entities/cloudsBg";
import logo from "@Scenes/Title/entities/logo";

export type Entity = {
	create: () => void;
	update?: () => void;
	destroy?: () => void;
};

export const entitiesIndex: Record<string, Entity> = {
	clouds_bg: cloudsBg,
	logo: logo
}

export function createEntity(key: string) {

	const entity = entitiesIndex[key];

	if (entity) {
		entity.create();
	} else {
		throw new Error(`Entity type with key ${key} not found`);
	}

}