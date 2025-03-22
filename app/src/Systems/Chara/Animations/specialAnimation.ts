import { Chara } from "../Chara";
import { tween } from "../../../Utils/animation";
import { TILE_HEIGHT, TILE_WIDTH } from "../../../Scenes/Battleground/constants";
import { getState } from "../../../Models/State";
import { emit, signals } from "../../../Models/Signals";

export async function specialAnimation(activeChara: Chara) {

	const { scene, unit } = activeChara;
	const state = getState();

	const pic = scene.add.image(
		activeChara.container.x, activeChara.container.y,
		unit.job + "/full"
	)
		.setDisplaySize(TILE_WIDTH, TILE_HEIGHT)
		.setOrigin(0.5, 0.5);

	emit(signals.UNIT_CASTS_SPECIAL, activeChara.id);
	//scene.playFx("audio/laser");

	await tween({
		targets: [pic],
		displayWidth: 250,
		displayHeight: 250,
		ease: "Power2",
		duration: 1000 / state.options.speed,
	});

	await tween({
		targets: [pic],
		displayWidth: 350,
		displayHeight: 350,
		alpha: 0,
		ease: "Power2",
		duration: 500 / state.options.speed,
	});
}
