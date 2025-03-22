import { tween } from "../../../Utils/animation";
import { defaultTextConfig } from "../../../Scenes/Battleground/constants";
import * as UnitManager from "../../../Scenes/Battleground/Systems/UnitManager";
import { getState } from "../../../Models/State";

// TODO: add color option (heals: green, damage: yellow, etc)
export async function popText(scene: Phaser.Scene, text: string, targetId: string) {

	const chara = UnitManager.getChara(targetId);
	const popText = scene.add.text(
		chara.container.x, chara.container.y,
		text,
		defaultTextConfig
	).setOrigin(0.5, 0.5);

	await tween({
		targets: [popText],
		alpha: 0,
		y: chara.container.y - 48,
		duration: 1000 / getState().options.speed,
		ease: "Linear"
	});

	popText.destroy();
}
