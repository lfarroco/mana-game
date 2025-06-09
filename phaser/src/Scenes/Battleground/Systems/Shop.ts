import { images } from "../../../assets";
import { getAllCards, getAllRelicDefinitions } from "../../../Models/Card";
import { vec2 } from "../../../Models/Geometry";
import { State } from "../../../Models/State";
import { makeUnit } from "../../../Models/Unit";
import { Flyout } from "../../../Systems/Flyout";
import { pickRandom } from "../../../utils";
import { FORCE_ID_PLAYER, SCREEN_WIDTH, titleTextConfig } from "../constants";
import { addCharaToState } from "./CharaManager";
import { RelicCard } from "./Relic";
import { Chara } from "../../../Systems/Chara/Chara";

import { BattlegroundScene } from "../BattlegroundScene";

// UI Layout Constants for Shop
const RELIC_SECTION_X = 50;
const RELIC_SECTION_Y = 50;
const RELIC_BG_WIDTH = 700;
const RELIC_BG_HEIGHT = 400;
const RELIC_TITLE_X = RELIC_SECTION_X + 250; // Example: adjust as needed
const RELIC_TITLE_Y = RELIC_SECTION_Y + 20;
const RELIC_ICON_BASE_Y = RELIC_SECTION_Y + 250;
const RELIC_ICON_SIZE = 200;
const RELIC_ICON_SPACING = 210;
const RELIC_FIRST_ICON_X = RELIC_SECTION_X + 130;

const TAVERN_BG_OFFSET_X = 800; // Offset from section start or absolute
const TAVERN_TITLE_X = RELIC_SECTION_X + TAVERN_BG_OFFSET_X + 100; // Example
const TAVERN_TITLE_Y = RELIC_SECTION_Y + 10; // Example
const TAVERN_CHARA_BASE_Y = RELIC_SECTION_Y + 250; // Example
const TAVERN_CHARA_FIRST_X = RELIC_SECTION_X + TAVERN_BG_OFFSET_X + 150; // Example
const TAVERN_CHARA_SPACING = 200;
const TAVERN_BG_WIDTH = 600;
const TAVERN_BG_HEIGHT = 400;


export const open = (scene: BattlegroundScene): Promise<void> => new Promise((resolve) => {

	const { state } = scene;
	const flyout = new Flyout(scene, "");

	relics(scene, flyout);

	tavern(scene, state, flyout);

	const nextRoundBtn = scene.uiManager.createButton( // Assuming uiManager is now directly on scene
		"Next Round",
		SCREEN_WIDTH - 180,
		500,
		async () => {
			await flyout.slideOut();
			flyout.destroy();
			resolve();
		}
	)
	flyout.add(nextRoundBtn);

	flyout.slideIn();
});

function relics(scene: BattlegroundScene, flyout: Flyout) {

	const relicData = pickRandom(getAllRelicDefinitions(), 3);

	const bg = scene.add.graphics()
		.fillStyle(0x000, 0.5)
		.fillRect(0, 0, RELIC_BG_WIDTH, RELIC_BG_HEIGHT)
		.setPosition(RELIC_SECTION_X, RELIC_SECTION_Y);

	const title = scene.add.text(RELIC_TITLE_X, RELIC_TITLE_Y, "Relics", titleTextConfig);
	flyout.add([bg, title]);

	relicData.forEach((relic, index) => {
		const x = RELIC_FIRST_ICON_X + (index * RELIC_ICON_SPACING);
		const y = RELIC_ICON_BASE_Y;

		const slot = scene.add
			.image(x, y, images.slot.key)
			.setDisplaySize(RELIC_ICON_SIZE, RELIC_ICON_SIZE);
		const icon = new RelicCard(scene, x, y, relic, RELIC_ICON_SIZE - 40, () => { // Keep padding for icon
			flyout.remove(icon)
		});

		flyout.add([slot, icon]);
	});
}

function tavern(scene: BattlegroundScene, state: State, flyout: Flyout) {

	const bg = scene.add.graphics()
		.fillStyle(0x000, 0.5)
		.fillRect(TAVERN_BG_OFFSET_X, 0, TAVERN_BG_WIDTH, TAVERN_BG_HEIGHT) // Assuming TAVERN_BG_WIDTH, TAVERN_BG_HEIGHT are defined
		.setPosition(RELIC_SECTION_X, RELIC_SECTION_Y); // Assuming tavern bg is relative to section start

	const title = scene.add.text(TAVERN_TITLE_X, TAVERN_TITLE_Y, "Tavern", titleTextConfig);
	flyout.add([bg, title]);

	const filtered = getAllCards()
		.filter(card => !state.gameData.player.units.map(u => u.cardId).includes(card.name)
		);

	pickRandom(filtered, 3)
		.forEach((spec, index) => {
			const unit = makeUnit(FORCE_ID_PLAYER, spec.id, vec2(0, 0));
			const chara = new Chara(flyout.parent, unit, {
				isShopItem: true,
				onPurchased: () => {
					scene.uiManager.tooltip.hide(); // Hide tooltip on purchase
					flyout.remove(chara); // Remove from shop display
					// Gold update and adding to player units is now handled by Chara.attemptPurchase
				}
			});

			addCharaToState(chara);

			chara.setPosition(TAVERN_CHARA_FIRST_X + (index * TAVERN_CHARA_SPACING), TAVERN_CHARA_BASE_Y);

			chara.addTooltip();

			chara.setBarsVisibility(false);

			flyout.add(chara);
		});
}
