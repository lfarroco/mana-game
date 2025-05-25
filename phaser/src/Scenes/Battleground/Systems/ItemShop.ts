import { updatePlayerGoldIO } from "../../../Models/Force";
import { Item } from "../../../Models/Item";
import { getState } from "../../../Models/State";
import * as Flyout from "../../../Systems/Flyout";
import * as Tooltip from "../../../Systems/Tooltip";
import { tween } from "../../../Utils/animation";
import * as constants from "../constants";
import { scene } from "./Choice";
import { displayError } from "./UIManager";

// continue from here:
// create undead units with deathrattle meachnics

const SHOP_TILE_SIZE = constants.TILE_WIDTH / 2;

export const itemShop = async (
	title: string,
	items: Item[],
) => new Promise<void>(async (resolve) => {

	const store = scene.add.container();

	const flyout = await Flyout.create(scene, title)

	Flyout.addExitButton(flyout, async () => {
		await flyout.slideIn();
		flyout.destroy();
		resolve();
	});

	flyout.add(store);

	flyout.slideIn();

	items.forEach((item, i) => {

		// 5 columns
		const x = 100 + (i % 5) * 150;
		const y = 200 + Math.floor(i / 5) * 150;

		const spacing = 16;

		const slot = scene.add.image(x, y, "ui/slot")
			.setOrigin(0.5)
			.setDisplaySize(SHOP_TILE_SIZE + spacing, SHOP_TILE_SIZE + spacing)

		const icon = scene.add.image(x, y, item.icon)
			.setDisplaySize(100, 100)
			.setOrigin(0.5)
			.setDisplaySize(SHOP_TILE_SIZE, SHOP_TILE_SIZE);

		const price = scene.add.text(
			icon.getBottomLeft().x + 20, icon.getBottomLeft().y,
			`${item.cost}`, {
			...constants.defaultTextConfig,
			align: "center",
		})
			.setOrigin(0.5);

		const rect = scene.add.rectangle(
			icon.getBottomLeft().x + 20, icon.getBottomLeft().y,
			60, 30,
			0xaaaa00, 1
		).setOrigin(0.5);

		store.add([slot, icon, rect, price]);

		icon.setInteractive();
		icon.on("pointerup", handleBuy(scene, item, icon, price))
		icon.on("pointerover", displayTooltip(icon, item));
		icon.on("pointerout", Tooltip.hide);

	});

});

const handleBuy = (
	scene: Phaser.Scene,
	item: Item,
	icon: Phaser.GameObjects.Image,
	priceText: Phaser.GameObjects.Text,
) => async () => {

	const player = getState().gameData.player;

	Tooltip.hide();

	if (player.gold < item.cost) {

		displayError("Not enough gold")

		return;
	}

	priceText.destroy();

	updatePlayerGoldIO(-item.cost);

	player.items.push(item);

	await tween({
		targets: [icon],
		y: icon.y - 100,
		duration: 1000 / 2,
	})

	await tween({
		targets: [icon],
		x: scene.cameras.main.width - 100,
		y: scene.cameras.main.height - 100,
	});

	icon.destroy();

}

const displayTooltip = (icon: Phaser.GameObjects.Image, item: Item) => () => {

	Tooltip.render(
		icon.x + 250,
		icon.y + 150,
		item.name,
		item.description,
	);
};