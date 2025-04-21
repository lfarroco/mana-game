import { Item } from "../../../Models/Item";
import { getState } from "../../../Models/State";
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

let sellText: Phaser.GameObjects.Text;

export function renderChestButton() {

	const chest = UIManager.scene.add.image(
		constants.SCREEN_WIDTH - 140,
		constants.SCREEN_HEIGHT - 100,
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

	const baseX = 100;
	const baseY = 100;

	// 3x3 grid
	new Array(9).fill(0).forEach((_, i) => {

		const x = i % 3;
		const y = Math.floor(i / 3);
		const position: [number, number] = [
			baseX + (x * constants.TILE_WIDTH) + (x * 16),
			baseY + (y * constants.TILE_WIDTH) + (y * 16)
		];

		const slot = UIManager.scene.add.image(0, 0, "ui/slot").setOrigin(0)
			.setDisplaySize(constants.TILE_WIDTH + 12, constants.TILE_WIDTH + 12)
			.setPosition(...position);

		chestContainer.add(slot);

		const item = state.gameData.player.items[i];

		if (!item) {
			return;
		}
		const icon = UIManager.scene.add.image(0, 0, item.icon)
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
			const targetChara = UnitManager.overlap(pointer);

			if (targetChara) {
				dropItemInChara(targetChara, icon, item);
				return;
			}

			if (Phaser.Geom.Intersects.RectangleToRectangle(
				icon.getBounds(),
				sellText.getBounds()
			)) {
				icon.destroy();

				state.gameData.player.items = state.gameData.player.items.filter(i => i.id !== item.id);
				updateChest();

				state.gameData.player.gold += Math.floor(item.cost / 2)
				UIManager.updateUI();

				return;
			}

			if (!targetChara) {
				icon.setPosition(...position);
				return;
			};


		});

	});

	sellZone();

}

function dropItemInChara(targetChara: Chara, icon: Phaser.GameObjects.Image, item: Item) {

	const state = getState();

	icon.destroy();

	const currentItem = targetChara.unit.equip;

	equipItemInGuildUnit({ unitId: targetChara.unit.id, item });

	state.gameData.player.items = state.gameData.player.items.filter(i => i.id !== item.id);

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

	sellText = UIManager.scene.add.text(
		200, constants.SCREEN_HEIGHT - 100,
		"Sell"
	).setFontSize(50);

	chestContainer.add(sellText);

}
