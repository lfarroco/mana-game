import { CardCollection, registerCollection } from "@Models/Entities/Card";
import { getCurrentScene } from "@Models/State";
import { Unit } from "@Models/Entities/Unit";
import { getName } from "@i18n/i18n";
import { createLogger } from "@Utils/Logger";

const logger = createLogger("index");

export function init(collection: CardCollection): void {
	registerCollection(collection);
}

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
				logger.debug(`Loading unit asset: ${getName(unit.cardId)} - ${unit.pic}`);
				scene.load.atlas(
					unit.pic,
					`assets/heroes/${unit.pic}.png`,
					`assets/heroes/${unit.pic}.json`
				);
				scene.load.json(`${unit.pic}-anims`, `assets/heroes/${unit.pic}-anims.json`);
				loadingCount++;
			}
		};

		units.forEach(loadAsset);

		if (loadingCount === 0) {
			resolve();
			return;
		}

		scene.load.once("complete", () => {
			logger.debug("Unit asset loading complete for BattlegroundScene.");
			resolve();
		});

		scene.load.start();
	});
