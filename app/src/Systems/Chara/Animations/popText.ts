import { tween } from "../../../Utils/animation";
import { defaultTextConfig } from "../../../Scenes/Battleground/constants";
import * as UnitManager from "../../../Scenes/Battleground/Systems/UnitManager";
import { getState } from "../../../Models/State";

// TODO: add color option (heals: green, damage: yellow, etc)
export async function popText({ scene, text, targetId, type, speed }: { scene: Phaser.Scene; text: string; targetId: string; type?: string; speed?: number }) {

	const animationSpeed = speed || getState().options.speed;

	const color = type === "heal" ? "#00FF00" : type === "damage" ? defaultTextConfig.color : undefined;

	const chara = UnitManager.getChara(targetId);
	const popText = scene.add.text(
		chara.container.x, chara.container.y,
		text,
		{
			...defaultTextConfig,
			fontSize: '42px',
			fontStyle: 'bold',
		}
	)
		.setOrigin(0.5, 0.5)
		.setColor(color || defaultTextConfig.color)

	await tween({
		targets: [popText],
		alpha: 0,
		y: chara.container.y - 64,
		duration: 1000 / animationSpeed,
		ease: "Linear"
	});

	popText.destroy();
}
