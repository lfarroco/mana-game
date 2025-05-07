import { tween } from "../../../Utils/animation";
import { defaultTextConfig } from "../../../Scenes/Battleground/constants";
import * as UnitManager from "../../../Scenes/Battleground/Systems/UnitManager";
import { getState } from "../../../Models/State";

const animationDuration = 1000;
// TODO: add color option (heals: green, damage: yellow, etc)
// TODO: move this to the chara system, as it always uses the chara container
export async function popText({ text, targetId, type, speed = 1 }: { text: string; targetId: string; type?: string; speed?: number }) {

	const animationSpeed = getState().options.speed * speed;
	const chara = UnitManager.getChara(targetId);
	if (!chara) {
		console.warn("Chara not found for popText", targetId);
		return;
	}
	const { scene } = chara;

	const color = type === "heal" ? "#00FF00" : type === "damage" ? defaultTextConfig.color : undefined;

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
		.setColor(color || defaultTextConfig.color as string)

	await tween({
		targets: [popText],
		alpha: 0,
		y: chara.container.y - 64,
		duration: animationDuration / animationSpeed,
		ease: "Linear"
	});

	popText.destroy();
}
