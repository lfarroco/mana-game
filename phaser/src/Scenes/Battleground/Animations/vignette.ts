import { tween } from "../../../Utils/animation";
import { COLOR_BLACK } from "../../../Utils/colors";
import BattlegroundScene from "../BattlegroundScene";
import { defaultTextConfig } from "../constants";

// display a text in the center of the screen, with a fading gradient rect behind it
export async function vignette(scene: BattlegroundScene, text: string) {

	const rect = scene.add.rectangle(
		0, scene.scale.height / 2,
		scene.scale.width, 100,
		COLOR_BLACK)
		.setOrigin(0, 0)
		.setAlpha(0)
		.setScrollFactor(0);

	const textObj = scene.add.text(
		-300, scene.scale.height / 2 + 50,
		text,
		defaultTextConfig
	).setOrigin(0.5, 0.5).setScrollFactor(0);

	tween({
		targets: [textObj],
		x: scene.scale.width / 2,
		onComplete: () => {
			tween({
				targets: [textObj],
				ease: "Expo.easeIn",
				x: scene.scale.width + 300,
				delay: 500,
				duration: 250,
				onComplete: () => {
					textObj.destroy();
				}
			});
		}
	});

	await tween({
		targets: [rect],
		alpha: 0.5,
		duration: 1000,
		yoyo: true,
		onComplete: () => rect.destroy()
	});

}
