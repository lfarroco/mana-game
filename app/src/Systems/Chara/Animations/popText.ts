import { tween } from "../../../Utils/animation";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { defaultTextConfig } from "../../../Scenes/Battleground/constants";

// TODO: add color option (heals: green, damage: yellow, etc)
export async function popText(scene: BattlegroundScene, text: string, targetId: string) {

	const chara = scene.getChara(targetId);
	const popText = scene.add.text(
		chara.container.x, chara.container.y,
		text,
		defaultTextConfig
	).setOrigin(0.5, 0.5);

	await tween({
		targets: [popText],
		alpha: 0,
		y: chara.container.y - 48,
		duration: 1000 / scene.state.options.speed,
		ease: "Linear"
	});

	popText.destroy();
}
