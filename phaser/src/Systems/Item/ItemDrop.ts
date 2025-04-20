import { FORCE_ID_CPU } from "../../Models/Force";
import { ITEMS } from "../../Models/Item";
import { getState } from "../../Models/State";
import { tween } from "../../Utils/animation";
import { Chara } from "../Chara/Chara";

export const dropItem = async (chara: Chara) => {

	const { scene } = chara;

	if (chara.unit.force !== FORCE_ID_CPU) return;

	// render item at location

	const item = scene.add.image(
		chara.container.x, chara.container.y,
		ITEMS.RED_POTION().icon)
		.setScale(0.3)

	await tween({
		targets: [item],
		y: item.y - 100,
		duration: 500,
		ease: 'Power2',
	});

	// accelerate towards lower right of the screen
	await tween({
		targets: [item],
		x: scene.cameras.main.width - 100,
		y: scene.cameras.main.height - 100,
		duration: 500,
		alpha: 0,
		ease: 'Power2',
	})

	item.destroy();

	getState().gameData.player.items.push(ITEMS.RED_POTION());

}