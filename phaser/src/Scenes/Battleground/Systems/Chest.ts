import { Item } from "../../../Models/Item";
import { getState, State } from "../../../Models/State";
import { Chara } from "../../../Systems/Chara/Chara";
import { equipItemInGuildUnit } from "../../../Systems/Item/EquipItem";
import * as Tooltip from "../../../Systems/Tooltip";
import { tween } from "../../../Utils/animation";
import * as constants from "../constants";
import * as UIManager from "./UIManager";
import * as UnitManager from "./UnitManager";

const chestWidth = constants.SCREEN_WIDTH / 2 - 100;

let isChestOpen = false;
let isAnimating = false;
let chestContainer: Phaser.GameObjects.Container;

let sellImage: Phaser.GameObjects.Image;

export const position: [number, number] = [
	constants.SCREEN_WIDTH - 140,
	constants.SCREEN_HEIGHT - 100
];

export function renderChestButton() {

	const chest = UIManager.scene.add.image(
		...position,
		"ui/chest"
	).setOrigin(0.5).setDisplaySize(250, 250);

	chest.setInteractive();

	chestContainer = UIManager.scene.add.container(0, 0);

	chest.on("pointerup", async () => {
		if (isAnimating) return;

		if (isChestOpen) {
			isChestOpen = false;
			isAnimating = true;
			await tween({
				targets: [chestContainer],
				x: -chestWidth,
				duration: 500,
				ease: "Power2",

			});

			isAnimating = false;
			chestContainer.removeAll(true);
		} else {
			isChestOpen = true;
			UIManager.scene.children.bringToTop(chestContainer);
			chestContainer.setX(-chestWidth);

			updateChest();

			isAnimating = true;
			await tween({
				targets: [chestContainer],
				x: 0,
				duration: 500,
				ease: "Power2",
			});
			isAnimating = false;
		}

	});
}

export function updateChest() {

	const state = getState();

	chestContainer.removeAll(true);

	background();

	title();

	const baseX = 200;
	const baseY = 200;

	// 3x3 grid
	const slots = new Array(9).fill(0).map((_, i) => {

		const x = i % 3;
		const y = Math.floor(i / 3);
		const position: [number, number] = [
			baseX + (x * constants.TILE_WIDTH) + (x * 16),
			baseY + (y * constants.TILE_WIDTH) + (y * 16)
		];

		const slot = UIManager.scene.add.image(0, 0, "ui/slot")
			.setOrigin(0.5)
			.setDisplaySize(constants.TILE_WIDTH + 12, constants.TILE_WIDTH + 12)
			.setPosition(...position);

		chestContainer.add(slot);

		const item = state.gameData.player.items[i];

		if (!item) {
			return slot;
		}
		const icon = UIManager.scene.add.image(0, 0, item.icon)
			.setDisplaySize(constants.TILE_WIDTH, constants.TILE_WIDTH)
			.setOrigin(0.5)
			.setName(item.id);

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
			chestContainer.bringToTop(icon);
		});
		icon.on("drag", (pointer: Phaser.Input.Pointer) => {
			icon.x = pointer.x;
			icon.y = pointer.y;
		});
		icon.on("dragend", (pointer: Phaser.Input.Pointer) => {
			const targetChara = UnitManager.overlap(pointer);

			if (targetChara) {
				dropItemInChara(targetChara, icon, item);
				return;
			}

			if (Phaser.Geom.Intersects.RectangleToRectangle(
				icon.getBounds(),
				sellImage.getBounds()
			)) {
				handleSelling(icon, state, item);
				return;
			}


			// check if dropped over another item
			const targetSlot = slots.find(slot => Phaser.Geom.Intersects.RectangleToRectangle(
				new Phaser.Geom.Rectangle(pointer.x, pointer.y, 1, 1),
				slot.getBounds()
			));

			if (targetSlot) {
				// move item to slot
				// if the slot is not empty, switch

				chestContainer.bringToTop(icon);

				const targetIndex = slots.indexOf(targetSlot);
				const targetItem = state.gameData.player.items[targetIndex];
				if (targetItem) {
					// swap items in state, update ches

					state.gameData.player.items[i] = targetItem;
					state.gameData.player.items[targetIndex] = item;

					updateChest();

					return;
				}

				// move item to slot

				state.gameData.player.items[i] = null;
				state.gameData.player.items[targetIndex] = item;

				// update chest
				updateChest();

			}

			// nothing happened, return to original position
			icon.setPosition(...position);
			return;

		});

		return slot

	});

	sellZone();

}

function handleSelling(icon: Phaser.GameObjects.Image, state: State, item: Item) {

	icon.destroy();

	state.gameData.player.items = state.gameData.player.items.filter(i => i?.id !== item.id);
	updateChest();

	UIManager.coinDropIO(item.cost / 2, item.cost / 2, icon.x, icon.y)
}

function dropItemInChara(targetChara: Chara, icon: Phaser.GameObjects.Image, item: Item) {

	const state = getState();

	icon.destroy();

	const currentItem = targetChara.unit.equip;

	equipItemInGuildUnit({ unitId: targetChara.unit.id, item });

	state.gameData.player.items = state.gameData.player.items.filter(i => i?.id !== item.id);

	if (currentItem !== null) {
		state.gameData.player.items.push(currentItem);
	}

	updateChest();

}

function title() {
	const title = UIManager.scene.add.text(
		400, 50,
		"Chest",
		{
			...constants.defaultTextConfig,
			color: "#ffffff",
		})
		.setOrigin(0.5)
		.setFontFamily("Arial Black")
		.setStroke("black", 14)
		;

	chestContainer.add(title);
}

function background() {
	const bg = UIManager.scene.add.image(0, 0, "ui/wood_texture");

	bg.setDisplaySize(chestWidth, constants.SCREEN_HEIGHT);
	bg.setOrigin(0);
	bg.setInteractive();

	chestContainer.add(bg);
}

function sellZone() {

	sellImage = UIManager.scene.add.image(
		400, constants.SCREEN_HEIGHT - 150,
		"icon/sell"
	).setScale(0.3);
	const sellText = UIManager.scene.add.text(
		400, constants.SCREEN_HEIGHT - 150,
		"Sell",
		constants.defaultTextConfig,
	)
		.setOrigin(0.5)
		.setFontFamily("Arial Black")
		.setStroke("black", 14)
		;

	chestContainer.add([sellImage, sellText]);

}
