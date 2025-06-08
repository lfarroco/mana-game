import { images } from "../../../assets";
import { getEmptySlot } from "../../../Models/Board";
import { getAllCards, getAllRelicDefinitions } from "../../../Models/Card";
import { playerForce, updatePlayerGoldIO } from "../../../Models/Force";
import { vec2 } from "../../../Models/Geometry";
import { State } from "../../../Models/State";
import { makeUnit } from "../../../Models/Unit";
import { Flyout } from "../../../Systems/Flyout";
import * as Tooltip from "../../../Systems/Tooltip";
import { pickRandom } from "../../../utils";
import { tween } from "../../../Utils/animation";
import { FORCE_ID_PLAYER, MAX_PARTY_SIZE, SCREEN_WIDTH, titleTextConfig } from "../constants";
import { addCharaToState, getCharaPosition } from "./CharaManager";
import { RelicCard } from "./Relic";
import { Chara } from "../../../Systems/Chara/Chara";

import { BattlegroundScene } from "../BattlegroundScene"; // Assuming this is your actual scene class
interface BattlegroundSceneWithUIManager extends BattlegroundScene {
	uiManager: import('./UIManager').UIManager; // Adjust path as needed
}

export const open = (scene: BattlegroundScene) => new Promise<void>(async (resolve) => {

	const { state } = scene;
	const flyout = new Flyout(scene, "");

	relics(scene, flyout);

	tavern(state, flyout);

	const nextRoundBtn = (scene as BattlegroundSceneWithUIManager).uiManager.createButton(
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

function relics(scene: BattlegroundSceneWithUIManager, flyout: Flyout) {

	const relicData = pickRandom(getAllRelicDefinitions(), 3);

	const bg = scene.add.graphics()
		.fillStyle(0x000, 0.5)
		.fillRect(0, 0, 700, 400)
		.setPosition(50, 50);

	const title = scene.add.text(300, 70, "Relics", titleTextConfig);
	flyout.add([bg, title]);

	relicData.forEach((relic, index) => {
		const x = index * 210 + 180;
		const y = 300;
		const iconSize = 200;

		const slot = scene.add
			.image(x, y, images.slot.key)
			.setDisplaySize(iconSize, iconSize);
		const icon = new RelicCard(scene, x, y, relic, 200 - 40, () => {
			flyout.remove(icon)
		});

		flyout.add([slot, icon]);
	});
}

function tavern(state: State, flyout: Flyout) {

	const bg = flyout.parent.add.graphics()
		.fillStyle(0x000, 0.5)
		.fillRect(800, 0, 600, 400)
		.setPosition(50, 50);

	const title = flyout.parent.add.text(900, 60, "Tavern", titleTextConfig);
	flyout.add([bg, title]);

	const filtered = getAllCards()
		.filter(card => !state.gameData.player.units.map(u => u.cardId).includes(card.name)
		);

	pickRandom(filtered, 3)
		.forEach((spec, index) => {
			const unit = makeUnit(FORCE_ID_PLAYER, spec.id, vec2(0, 0));
			const chara = new Chara(flyout.parent, unit);

			addCharaToState(chara);

			chara.setPosition(950 + index * 200, 300);

			chara.addTooltip();

			// TODO: replace with drag and drop
			chara.on("pointerup", () => {

				if (state.gameData.player.units.length >= MAX_PARTY_SIZE) {
					(flyout.parent as BattlegroundSceneWithUIManager).uiManager.displayError("Your party is full! Discard a card or skip.");
					return;
				}

				if (playerForce.gold < 3) {
					(flyout.parent as BattlegroundSceneWithUIManager).uiManager.displayError("You don't have enough gold!");
					return;
				}

				updatePlayerGoldIO(flyout.parent, -3);

				Tooltip.hide();
				flyout.remove(chara);
				chara.off("pointerup");

				const emptySlot = getEmptySlot(playerForce.units, playerForce.id);
				if (!emptySlot) throw new Error("No empty slot found");

				chara.unit.position = emptySlot;
				state.gameData.player.units.push(chara.unit);

				const pos = getCharaPosition(chara.unit);
				tween({
					targets: [chara],
					...pos,
					onComplete: () => {
						//card.addBoardEvents();
					}
				});

			});

			flyout.add(chara);
		});
}
