import { Chara } from "../Chara";
import { tween } from "../../../Utils/animation";
import { TILE_HEIGHT, TILE_WIDTH } from "../../../Scenes/Battleground/constants";

export async function specialAnimation(activeChara: Chara) {

	const { scene, unit } = activeChara;

	const pic = scene.add.image(
		activeChara.x, activeChara.y,
		"charas/" + unit.job
	)
		.setDisplaySize(TILE_WIDTH, TILE_HEIGHT)
		.setOrigin(0.5, 0.5);

	await tween({
		targets: [pic],
		displayWidth: 250,
		displayHeight: 250,
		duration: 1000,
	});

	await tween({
		targets: [pic],
		displayWidth: 350,
		displayHeight: 350,
		alpha: 0,
	});
}
