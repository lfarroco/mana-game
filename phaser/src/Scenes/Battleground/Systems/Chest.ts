import { Item } from "../../../Models/Item";
import { getState, State } from "../../../Models/State";
import { Chara } from "../../../Systems/Chara/Chara";
import * as Flyout from "../../../Systems/Flyout";
import { equipItemInGuildUnit } from "../../../Systems/Item/EquipItem";
import * as Tooltip from "../../../Systems/Tooltip";
import * as constants from "../constants";
import * as UIManager from "./UIManager";
import * as UnitManager from "./UnitManager";

const CHEST_TILE_SIZE = constants.TILE_WIDTH / 2;

export const position: [number, number] = [
	constants.SCREEN_WIDTH - 120,
	constants.SCREEN_HEIGHT - 100
];
export let isChestOpen = false;
export let isAnimating = false;

export let flyout: Container;
export let chestContainer: Container;

export async function renderChestButton() {

	const chest = UIManager.scene.add.image(
		...position,
		"ui/chest")
		.setOrigin(0.5)
		.setDisplaySize(230, 230);

	chest.setInteractive();

	chestContainer = UIManager.scene.add.container(0, 0)

	flyout = await Flyout.create(UIManager.scene, "Chest")
	Flyout.addExitButton(flyout, () => closeChest());

	flyout.add(chestContainer);

	chest.on("pointerup", handleChestButtonClick());
}

const handleChestButtonClick = () => async () => {
	if (isAnimating) return;

	if (isChestOpen) {
		await closeChest();
	} else {
		await openChest();
	}
}

const openChest = async () => {
	isChestOpen = true;

	updateChestIO();

	isAnimating = true;
	await Flyout.slideFlyoutIn(flyout);
	isAnimating = false;
}

const closeChest = async () => {
	isChestOpen = false;

	isAnimating = true;
	await Flyout.retractFlyout(flyout);
	isAnimating = false;

	chestContainer.removeAll(true);
}

export const updateChestIO = async () => {

	const state = getState();

	chestContainer.removeAll(true);

	const sellImage = sellZone();

	const baseX = 200;
	const baseY = 200;

	const gridWidth = 4;
	const gridHeight = 4;
	const spacing = 16;

	const slots = new Array(gridWidth * gridHeight)
		.fill(0)
		.map((_, index) => {

			const x = index % gridWidth;
			const y = Math.floor(index / gridHeight);
			const position: [number, number] = [
				baseX + (x * CHEST_TILE_SIZE) + (x * spacing),
				baseY + (y * CHEST_TILE_SIZE) + (y * spacing)
			];

			const slot = UIManager.scene.add.image(0, 0, "ui/slot")
				.setOrigin(0.5)
				.setDisplaySize(CHEST_TILE_SIZE + spacing, CHEST_TILE_SIZE + spacing)
				.setPosition(...position);

			chestContainer.add(slot);

			const item = state.gameData.player.items[index];

			if (!item) {
				return slot;
			}
			const icon = UIManager.scene.add.image(0, 0, item.icon)
				.setDisplaySize(CHEST_TILE_SIZE, CHEST_TILE_SIZE)
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

				if (targetChara && state.gameData.player.units.find(chara => chara.id === targetChara.unit.id)) {

					dropItemInChara(targetChara, icon, item, updateChestIO);
					return;
				}

				if (Phaser.Geom.Intersects.RectangleToRectangle(
					icon.getBounds(),
					sellImage.getBounds()
				)) {
					handleSelling(icon, state, item, updateChestIO);
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

						state.gameData.player.items[index] = targetItem;
						state.gameData.player.items[targetIndex] = item;

						updateChestIO();

						return;
					}

					// move item to slot

					state.gameData.player.items[index] = null;
					state.gameData.player.items[targetIndex] = item;

					// update chest
					updateChestIO();

				}

				// nothing happened, return to original position
				icon.setPosition(...position);
				return;

			});

			return slot

		});
}

function handleSelling(icon: Phaser.GameObjects.Image, state: State, item: Item, onSell: () => void) {

	icon.destroy();

	state.gameData.player.items = state.gameData.player.items.filter(i => i?.id !== item.id);
	onSell();

	UIManager.coinDropIO(item.cost / 2, item.cost / 2, icon.x, icon.y)
}

function dropItemInChara(targetChara: Chara, icon: Phaser.GameObjects.Image, item: Item, onDrop: () => void) {

	const state = getState();

	icon.destroy();

	const currentItem = targetChara.unit.equip;

	equipItemInGuildUnit({ unitId: targetChara.unit.id, item });

	state.gameData.player.items = state.gameData.player.items.filter(i => i?.id !== item.id);

	if (currentItem !== null) {
		state.gameData.player.items.push(currentItem);
	}

	onDrop();
}

function sellZone() {

	const sellImage = UIManager.scene.add.image(
		400, constants.SCREEN_HEIGHT - 200,
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

	return sellImage

}
