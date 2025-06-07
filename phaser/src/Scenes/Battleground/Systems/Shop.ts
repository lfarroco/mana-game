import { images } from "../../../assets";
import { getEmptySlot } from "../../../Models/Board";
import { getAllCards } from "../../../Models/Card";
import { playerForce, updatePlayerGoldIO } from "../../../Models/Force";
import { vec2 } from "../../../Models/Geometry";
import { State } from "../../../Models/State";
import { makeUnit } from "../../../Models/Unit";
import { addBoardEvents, addTooltip, createCard } from "../../../Systems/Chara/Chara";
import { Flyout } from "../../../Systems/Flyout";
import * as Tooltip from "../../../Systems/Tooltip";
import { pickRandom } from "../../../utils";
import { tween } from "../../../Utils/animation";
import BattlegroundScene from "../BattlegroundScene";
import { FORCE_ID_PLAYER, MAX_PARTY_SIZE, SCREEN_WIDTH, titleTextConfig } from "../constants";
import { getCharaPosition } from "./CharaManager";
import { createButton, displayError } from "./UIManager";
import { RelicCard } from "./RelicCard";

export const open = (scene: BattlegroundScene) => new Promise<void>(async (resolve) => {

	const { state } = scene;
	const flyout = new Flyout(scene, "");

	relics(scene, flyout);

	tavern(state, flyout);

	const nextRoundBtn = createButton(
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
	const relics = [
		images.arrow.key, images.agility_training.key, images.chest.key
	];

	const bg = scene.add.graphics()
		.fillStyle(0x000, 0.5)
		.fillRect(0, 0, 700, 400)
		.setPosition(50, 50);

	const title = scene.add.text(300, 70, "Relics", titleTextConfig);
	flyout.add([bg, title]);

	relics.forEach((relic, index) => {
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

	const bg = flyout.scene.add.graphics()
		.fillStyle(0x000, 0.5)
		.fillRect(800, 0, 600, 400)
		.setPosition(50, 50);

	const title = flyout.scene.add.text(900, 60, "Tavern", titleTextConfig);
	flyout.add([bg, title]);

	const filtered = getAllCards()
		.filter(card => !state.gameData.player.units.map(u => u.job).includes(card.name)
		);

	pickRandom(filtered, 3)
		.forEach((spec, index) => {
			const unit = makeUnit(FORCE_ID_PLAYER, spec.name, vec2(0, 0));
			const card = createCard(unit);

			card.container.setPosition(950 + index * 200, 300);

			card.zone.setInteractive({ draggable: true });

			addTooltip(card);

			// TODO: replace with drag and drop
			card.zone.on("pointerup", () => {

				if (state.gameData.player.units.length >= MAX_PARTY_SIZE) {
					displayError("Your party is full! Discard a card or skip.");
					return;
				}

				if (playerForce.gold < 3) {
					displayError("You don't have enough gold!");
					return;
				}

				updatePlayerGoldIO(-3);

				Tooltip.hide();
				flyout.remove(card.container);
				card.zone.off("pointerup");

				const emptySlot = getEmptySlot(playerForce.units, playerForce.id);
				if (!emptySlot) throw new Error("No empty slot found");

				card.unit.position = emptySlot;
				state.gameData.player.units.push(card.unit);

				const pos = getCharaPosition(card.unit);
				tween({
					targets: [card.container],
					...pos,
					onComplete: () => {
						addBoardEvents(card);
					}
				});

			});

			flyout.add(card.container);
		});
}

