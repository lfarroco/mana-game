import { getState } from "../../../Models/State";
import { popText } from "./popText";
import { Chara } from "../Chara";
import { tween } from "../../../Utils/animation";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { HALF_TILE_WIDTH, HALF_TILE_HEIGHT } from "../../../Scenes/Battleground/constants";

export async function slashAnimation(
	scene: BattlegroundScene,
	activeChara: Chara,
	targetChara: Chara,
	damage: number) {


	const state = getState();
	const slash = scene.add
		.sprite(0, 0, "cethiel-slash")
		.play("cethiel-slash")
		.setScale(1.5)
		.setDepth(10000);


	slash.x = targetChara.container.x + HALF_TILE_WIDTH;
	slash.y = targetChara.container.y - HALF_TILE_HEIGHT;

	scene.playFx("audio/sword2");

	scene.time.addEvent({
		delay: 250 / state.options.speed,
		callback: () => {
			popText(scene, damage.toString(), targetChara.unit.id);

			// make target unit flash
			tween(scene, {
				targets: targetChara.container,
				alpha: 0.5,
				duration: 100 / state.options.speed,
				yoyo: true,
				repeat: 4,
			});

		}
	});

	await tween(scene, {
		targets: slash,
		x: targetChara.container.x - HALF_TILE_WIDTH / 2,
		y: targetChara.container.y + HALF_TILE_HEIGHT / 2,
		duration: 500 / state.options.speed,
		onComplete: () => {
			slash.destroy();
		}
	});

}
