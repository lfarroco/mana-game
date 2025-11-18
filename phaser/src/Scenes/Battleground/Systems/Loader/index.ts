import { CardCollection, registerCollection } from "@Models/Entities/Card";
import { scene } from "../../BattlegroundScene";

export function init(collection: CardCollection): void {
	registerCollection(collection);
}

export const loadDynamicAssets = (collection: CardCollection): Promise<void> =>
	new Promise((resolve) => {
		const loadAsset = (asset: { name: string; pic: string }, type: string) => {
			console.log(`Loading ${type} asset: ${asset.name} - ${asset.pic}`);
			scene.load.image(asset.pic, asset.pic);
		};

		collection.cards.forEach((card) => loadAsset(card, "card"));

		scene.load.once("complete", () => {
			console.log("Dynamic asset loading complete for BattlegroundScene.");
			resolve();
		});

		scene.load.start();
	});
