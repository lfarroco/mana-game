import { updatePlayerGoldIO } from "../../../Models/Force";
import { Item } from "../../../Models/Item";
import { getState } from "../../../Models/State";
import * as Tooltip from "../../../Systems/Tooltip";
import { tween } from "../../../Utils/animation";
import * as constants from "../constants";
import { scene } from "./Choice";

// continue from here:
// create undead units with deathrattle meachnics

export const itemShop = async (
	title: string,
	items: Item[],
) => new Promise<void>((resolve) => {

	const store = scene.add.container();

	const bg = scene.add.image(0, 0, "ui/wood_texture").setOrigin(0);
	store.add(bg);

	renderTitle(store, title);

	items.forEach((item, i) => {

		// 5 columns
		const x = 100 + (i % 5) * 150;
		const y = 140 + Math.floor(i / 5) * 250;

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
		icon.on("pointerup", handleBuy(scene, item, icon, price))
		icon.on("pointerover", displayTooltip(icon, item));
		icon.on("pointerout", Tooltip.hide);

	});

	const sellImage = scene.add.image(
		400, constants.SCREEN_HEIGHT - 200,
		"icon/sell"
	).setScale(0.3);
	const sellText = scene.add.text(
		400, constants.SCREEN_HEIGHT - 150,
		"Sell",
		constants.defaultTextConfig,
	)

	store.add([sellImage, sellText]);

	const exit = scene.add.image(0, 0, "icon/exit")
		.setScale(0.3)
		.setOrigin(0.5)
		.setInteractive()
		.setPosition(400, scene.cameras.main.height - 200)
		.on("pointerup", () => {
			store.destroy();
			exit.destroy();
			resolve();
			exitText.destroy();
		});

	const exitText = scene.add.text(
		400, constants.SCREEN_HEIGHT - 150,
		"Exit",
		constants.defaultTextConfig,
	)
		.setOrigin(0.5)
		.setFontFamily("Arial Black")
		.setStroke("black", 14)
		;

});

function renderTitle(parent: Phaser.GameObjects.Container, title: string) {
	const titleText = parent.scene.add.text(
		400, 50,
		title,
		{
			...constants.defaultTextConfig,
			color: "#ffffff",
		})
		.setOrigin(0.5)
		.setFontFamily("Arial Black")
		.setStroke("black", 14)
		;

	parent.add(titleText);
}

const handleBuy = (
	scene: Phaser.Scene,
	item: Item,
	icon: Phaser.GameObjects.Image,
	priceText: Phaser.GameObjects.Text,
) => async () => {

	const player = getState().gameData.player;

	Tooltip.hide();

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

	priceText.destroy();

	updatePlayerGoldIO(-item.cost);

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


const displayTooltip = (icon: Phaser.GameObjects.Image, item: Item) => () => {

	Tooltip.render(
		icon.x + 400,
		icon.y + 150,
		item.name,
		item.description,
	);
};