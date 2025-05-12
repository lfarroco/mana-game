import { tween } from "../../../Utils/animation";
import { defaultTextConfig, titleTextConfig } from "../../../Scenes/Battleground/constants";
import * as UnitManager from "../../../Scenes/Battleground/Systems/UnitManager";

// TODO: add color option (heals: green, damage: yellow, etc)
// TODO: move this to the chara system, as it always uses the chara container
export async function popText({ text, targetId, type }: { text: string; targetId: string; type?: string; speed?: number }) {

	const chara = UnitManager.getChara(targetId);
	if (!chara) {
		console.warn("Chara not found for popText", targetId);
		return;
	}
	const { scene } = chara;

	let color = defaultTextConfig.color;
	if (type === "heal") {
		color = "green";
	} else if (type === "damage") {
		color = "red";
	}

	const popText = scene.add.text(
		chara.container.x, chara.container.y,
		text,
		{
			...titleTextConfig,
		}
	)
		.setOrigin(0.5, 0.5)
		.setColor(color || defaultTextConfig.color as string)

	await tween({
		targets: [popText],
		scale: 1.4,
		y: chara.container.y - 64,
	});
	await tween({
		targets: [popText],
		alpha: 0,
		scale: 1,
		y: chara.container.y - 128,
	});

	popText.destroy();
}
