import { Chara } from "../Chara";
import { tween } from "../../../Utils/animation";
import { TILE_HEIGHT, TILE_WIDTH } from "../../../Scenes/Battleground/constants";

export async function specialAnimation(activeChara: Chara) {

	const { scene, unit } = activeChara;

	const pic = scene.add.image(
		activeChara.container.x, activeChara.container.y,
		unit.job + "/full"
	)
		.setDisplaySize(TILE_WIDTH, TILE_HEIGHT)
		.setOrigin(0.5, 0.5);

	scene.playFx("audio/laser");

	await tween({
		targets: [pic],
		displayWidth: 250,
		displayHeight: 250,
		ease: "Power2",
		duration: 1000 / scene.speed,
	});

	await tween({
		targets: [pic],
		displayWidth: 350,
		displayHeight: 350,
		alpha: 0,
		ease: "Power2",
		duration: 500 / scene.speed,
	});
}
