import { delay, tween } from "../../../Utils/animation";
import { defaultTextConfig, FORCE_ID_PLAYER, titleTextConfig } from "../../../Scenes/Battleground/constants";
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

	// random angle upwards
	const angle = Math.random() * 30 * (chara.unit.force === FORCE_ID_PLAYER ? 1 : -1);

	tween({
		targets: [popText],
		scale: 1.4,
		duration: 1000,
		y: chara.container.y - 128,
		// in the angle direction
		x: chara.container.x + Math.sin(angle * Math.PI / 180) * 256,
	});
	tween({
		targets: [popText],
		delay: 500,
		alpha: 0,
		duration: 1000
	});

	await delay(scene, 1500);

	popText.destroy();
}
