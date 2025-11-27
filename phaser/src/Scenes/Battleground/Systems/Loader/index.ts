import { CardCollection, registerCollection } from "@Models/Entities/Card";
import { getCurrentScene } from "@Models/State";
import { Unit } from "@Models/Entities/Unit";

export function init(collection: CardCollection): void {
	registerCollection(collection);
}

export const loadDynamicAssets = (collection: CardCollection): Promise<void> =>
	new Promise((resolve) => {

		const scene = getCurrentScene()
		const loadAsset = (asset: { name: string; pic: string }, type: string) => {
			console.log(`Loading ${type} asset: ${asset.name} - ${asset.pic}`);
			scene.load.image(asset.pic, asset.pic);
		};

		collection.cards.forEach((card) => loadAsset(card, "card"));

		if (scene.load.totalToLoad === 0) {
			resolve();
			return;
		}

		scene.load.once("complete", () => {
			console.log("Dynamic asset loading complete for BattlegroundScene.");
			resolve();
		});

		scene.load.start();
	});

export const loadUnitAssets = (units: Unit[]): Promise<void> =>
	new Promise((resolve) => {
		const scene = getCurrentScene();
		let loadingCount = 0;

		const loadAsset = (unit: Unit) => {
			if (unit.isCore) return;

			const animCacheKey = unit.pic + "-anims";
			const animData = scene.cache.json.get(animCacheKey);
			const textureExists = scene.textures.exists(unit.pic);

			if (!animData || !textureExists) {
				console.log(`Loading unit asset: ${unit.name} - ${unit.pic}`);
				scene.load.atlas(unit.pic, `assets/heroes/${unit.pic}.png`, `assets/heroes/${unit.pic}.json`);
				scene.load.animation(`${unit.pic}-anims`, `assets/heroes/${unit.pic}-anims.json`);
				loadingCount++;
			}
		};

		units.forEach(loadAsset);

		if (loadingCount === 0) {
			resolve();
			return;
		}

		scene.load.once("complete", () => {
			console.log("Unit asset loading complete for BattlegroundScene.");
			resolve();
		});

		scene.load.start();
	});
