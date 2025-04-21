import { Item, ITEMS } from "../../../Models/Item";
import { getState } from "../../../Models/State";
import { tween } from "../../../Utils/animation";
import * as constants from "../constants";
import { scene } from "./Choice";
import * as UIManager from "./UIManager";

export const itemShop = async () => new Promise<void>((resolve) => {
	const choices = [
		ITEMS.RED_POTION(),
		ITEMS.IRON_SWORD(),
		ITEMS.RED_POTION(),
		ITEMS.RED_POTION(),
		ITEMS.RED_POTION(),
		ITEMS.IRON_SWORD(),
		ITEMS.IRON_SWORD(),
		ITEMS.IRON_SWORD(),
	];

	const store = scene.add.container();

	const bg = scene.add.image(0, 0, "ui/wood_texture").setOrigin(0);
	store.add(bg);

	choices.forEach((item, i) => {

		// 5 columns
		const x = 100 + (i % 5) * 150;
		const y = 100 + Math.floor(i / 5) * 250;

		const icon = scene.add.image(x, y, item.icon)
			.setDisplaySize(100, 100)
			.setOrigin(0)
			.setScale(0.3);

		store.add(icon);

		const price = scene.add.text(icon.x + icon.displayWidth / 2, icon.y + icon.displayHeight + 20, `${item.cost}`, {
			...constants.defaultTextConfig,
			align: "center",
		})
			.setOrigin(0.5);
		store.add(price);

		icon.setInteractive();
		icon.on("pointerup", handlePick(scene, item, icon, price))

	});

	const exit = scene.add.text(0, 0, "Exit Shop", constants.defaultTextConfig)
		.setOrigin(0)
		.setInteractive()
		.setPosition(300, scene.cameras.main.height - 100)
		.on("pointerup", () => {
			store.destroy();
			exit.destroy();
			resolve();
		});

});

const handlePick = (
	scene: Phaser.Scene,
	item: Item,
	icon: Phaser.GameObjects.Image,
	price: Phaser.GameObjects.Text,
) => async () => {

	const player = getState().gameData.player;

	if (player.gold < item.cost) {
		const err = scene.add.text(0, 0, "Not enough gold", constants.defaultTextConfig);
		await tween({
			targets: [err],
			duration: 1000,
			alpha: 0,
			ease: "Power2",
		});

		err.destroy();

		return;
	}
	price.destroy();

	player.gold -= item.cost;
	UIManager.updateUI();
	player.items.push(item);

	await tween({
		targets: [icon],
		y: icon.y - 100,
		duration: 1000 / 2,
		ease: "Power2",
	})

	await tween({
		targets: [icon],
		x: scene.cameras.main.width - 100,
		y: scene.cameras.main.height - 100,
		duration: 1000 / 2,
		ease: "Power2",
	});

	icon.destroy();

}