import { tween } from "../../../Utils/animation";
import { defaultTextConfig, titleTextConfig } from "../../../Scenes/Battleground/constants";
import * as UnitManager from "../../../Scenes/Battleground/Systems/CharaManager";

// TODO: add color option (heals: green, damage: yellow, etc)
// TODO: move this to the chara system, as it always uses the chara container
// TODO: for skills, use elastic pop. for damage, move the numbers
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
		chara.x, chara.y,
		text,
		{
			...titleTextConfig,
		}
	)
		.setOrigin(0.5, 0.5)
		.setColor(color || defaultTextConfig.color as string)

	// random angle upwards
	const angle = Math.random() * 30 * (Math.random() < 0.5 ? -1 : 1);

	tween({
		targets: [popText],
		scale: 1.4,
		duration: 1000,
		y: chara.y - 128,
		// in the angle direction
		x: chara.x + Math.sin(angle * Math.PI / 180) * 60,
	});
	await tween({
		targets: [popText],
		delay: 500,
		alpha: 0,
		duration: 1000
	});

	popText.destroy();
}
