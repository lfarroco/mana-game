import { Chara, getUnit } from "../Chara";
import { tween } from "../../../Utils/animation";
import { TILE_HEIGHT, TILE_WIDTH } from "../../../constants/constants";
import { scene } from "../../../Scenes/Battleground/BattlegroundScene";

export async function specialAnimation(activeChara: Chara) {
	const unit = getUnit(activeChara);

	const pic = scene.add.image(
		activeChara.x, activeChara.y,
		"charas/" + unit.cardId
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
