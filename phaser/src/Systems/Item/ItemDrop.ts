import { Item } from "../../Models/Item";
import { getState } from "../../Models/State";
import { tween } from "../../Utils/animation";

export const dropItem = async (scene: Phaser.Scene, position: { x: number, y: number }, item: Item) => {

	// render item at location

	const icon = scene.add.image(
		position.x, position.y,
		item.icon)
		.setScale(0.3)

	await tween({
		targets: [icon],
		y: icon.y - 100,
	});

	// accelerate towards lower right of the screen
	await tween({
		targets: [icon],
		x: scene.cameras.main.width - 100,
		y: scene.cameras.main.height - 100,
		alpha: 0,
	})

	icon.destroy();

	getState().gameData.player.items.push({ ...item });

}