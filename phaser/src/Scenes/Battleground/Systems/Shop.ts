import { getEmptySlot } from "../../../Models/Board";
import { getAllCards } from "../../../Models/Card";
import { playerForce } from "../../../Models/Force";
import { vec2 } from "../../../Models/Geometry";
import { makeUnit } from "../../../Models/Unit";
import { addBoardEvents, createCard } from "../../../Systems/Chara/Chara";
import { Flyout } from "../../../Systems/Flyout";
import { hide } from "../../../Systems/Tooltip";
import { pickRandom } from "../../../utils";
import { tween } from "../../../Utils/animation";
import BattlegroundScene from "../BattlegroundScene";
import { FORCE_ID_PLAYER, MAX_PARTY_SIZE, SCREEN_WIDTH } from "../constants";
import { getCharaPosition } from "./CharaManager";
import { createButton, displayError } from "./UIManager";

export const open = (scene: BattlegroundScene) => new Promise<void>(async (resolve) => {

	const { state } = scene;
	const flyout = new Flyout(scene, "Shop");

	const filtered =
		getAllCards().filter(card =>
			!state.gameData.player.units.map(u => u.job).includes(card.name)
		);

	pickRandom(filtered, 3)
		.forEach((spec, index) => {
			const unit = makeUnit(FORCE_ID_PLAYER, spec.name, vec2(0, 0));
			const card = createCard(unit);

			card.container.setPosition(750 + index * 200, 250);

			card.zone.setInteractive({ draggable: true });

			// TODO: replace with drag and drop
			card.zone.on("pointerup", () => {

				hide();
				flyout.remove(card.container);
				card.zone.off("pointerup");

				if (state.gameData.player.units.length >= MAX_PARTY_SIZE) {
					displayError("Your party is full! Discard a card or skip.");
					return;
				}
				const emptySlot = getEmptySlot(playerForce.units, playerForce.id);
				if (!emptySlot) throw new Error("No empty slot found");

				card.unit.position = emptySlot;
				state.gameData.player.units.push(card.unit);

				const pos = getCharaPosition(card.unit)
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

	const nextRoundBtn = createButton(
		"Next Round",
		SCREEN_WIDTH - 200,
		400,
		async () => {
			await flyout.slideOut();
			flyout.destroy();
			resolve();
		}
	)
	flyout.add(nextRoundBtn);

	flyout.slideIn();

});
