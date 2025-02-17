import { tween } from "../../../Utils/animation";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";

// TODO: add color option (heals: green, damage: yellow, etc)
export async function popText(scene: BattlegroundScene, text: string, targetId: string) {

	const chara = scene.getChara(targetId);
	const popText = scene.add.text(chara.container.x, chara.container.y, text, {
		fontSize: "24px",
		color: "#ffffff",
		stroke: "#000000",
		strokeThickness: 2,
		align: "center",
		fontStyle: "bold",
		shadow: {
			offsetX: 2,
			offsetY: 2,
			color: "#000",
			blur: 0,
			stroke: false,
			fill: true,
		}
	}).setOrigin(0.5, 0.5);

	await tween(scene, {
		targets: popText,
		alpha: 0,
		y: chara.container.y - 24,
		duration: 500 / scene.state.options.speed,
		ease: "Expo.easeOut",
	});

	popText.destroy();
}
