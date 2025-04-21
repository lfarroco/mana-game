import { getState } from "../../../Models/State";
import { equipItemInGuildUnit } from "../../../Systems/Item/EquipItem";
import * as Tooltip from "../../../Systems/Tooltip";
import * as constants from "../constants";
import { scene } from "./UIManager";
import { overlap } from "./UnitManager";

const chestWidth = constants.SCREEN_WIDTH / 2 - 100;

let isChestOpen = false;
let chestContainer: Phaser.GameObjects.Container;

export function renderChestButton() {

	const chest = scene.add.image(
		constants.SCREEN_WIDTH - 140,
		constants.SCREEN_HEIGHT - 100,
		"ui/chest"
	).setOrigin(0.5).setDisplaySize(250, 250);

	chest.setInteractive();

	chestContainer = scene.add.container(0, 0);

	chest.on("pointerup", () => {

		if (isChestOpen) {
			isChestOpen = false;
			scene.add.tween({
				targets: chestContainer,
				x: -chestWidth,
				duration: 500,
				ease: "Power2",
				onComplete: () => {
					chestContainer.removeAll(true);
				}
			});
		} else {
			isChestOpen = true;
			scene.children.bringToTop(chestContainer);
			chestContainer.setX(-chestWidth);

			updateChest();

			scene.add.tween({
				targets: chestContainer,
				x: 0,
				duration: 500,
				ease: "Power2",
			});
		}

	});
}

export function updateChest() {

	const state = getState();

	chestContainer.removeAll(true);

	const bg = scene.add.image(0, 0, "ui/wood_texture");

	bg.setDisplaySize(chestWidth, constants.SCREEN_HEIGHT);
	bg.setOrigin(0);
	bg.setInteractive();

	chestContainer.add(bg);

	const baseX = 100;
	const baseY = 100;

	// 3x3 grid
	new Array(9).fill(0).forEach((_, i) => {

		const x = i % 3;
		const y = Math.floor(i / 3);
		const position = [
			baseX + (x * constants.TILE_WIDTH) + (x * 16),
			baseY + (y * constants.TILE_WIDTH) + (y * 16)
		];

		const slot = scene.add.image(0, 0, "ui/slot").setOrigin(0)
			.setDisplaySize(constants.TILE_WIDTH + 12, constants.TILE_WIDTH + 12)
			.setPosition(...position);

		chestContainer.add(slot);

		const item = state.gameData.player.items[i];

		if (!item) {
			return;
		}
		const icon = scene.add.image(0, 0, item.icon)
			.setDisplaySize(constants.TILE_WIDTH, constants.TILE_WIDTH)
			.setOrigin(0);

		icon.setPosition(...position);
		chestContainer.add(icon);

		icon.setInteractive({ draggable: true });
		icon.on("pointerover", () => {
			Tooltip.render(
				icon.x + 400, icon.y + 100,
				item.name,
				item.description
			);
		});
		icon.on("pointerout", () => {
			Tooltip.hide();
		});
		icon.on("dragstart", () => {
			Tooltip.hide();
		});
		icon.on("drag", (pointer: Phaser.Input.Pointer) => {
			icon.x = pointer.x - constants.TILE_WIDTH / 2;
			icon.y = pointer.y - constants.TILE_WIDTH / 2;
		});

		icon.on("dragend", (pointer: Phaser.Input.Pointer) => {
			const targetChara = overlap(pointer);
			if (!targetChara) {
				icon.setPosition(...position);
				return;
			};
			icon.destroy();

			const currentItem = targetChara.unit.equip;

			equipItemInGuildUnit({ unitId: targetChara.unit.id, item });

			state.gameData.player.items = state.gameData.player.items.filter(i => i.id !== item.id);

			if (currentItem !== null) {
				state.gameData.player.items.push(currentItem);
			}

			updateChest();
		});

	});

}
