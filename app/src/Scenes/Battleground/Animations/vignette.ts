import { tween } from "../../../Utils/animation";
import BattlegroundScene from "../BattlegroundScene";

// display a text in the center of the screen, with a fading gradient rect behind it
export async function vignette(scene: BattlegroundScene, text: string) {

	const rect = scene.add.rectangle(
		0, scene.scale.height / 2,
		scene.scale.width, 100,
		0x000000
	).setOrigin(0, 0).setAlpha(0).setScrollFactor(0);

	const textObj = scene.add.text(
		-300, scene.scale.height / 2 + 50,
		text,
		{
			fontSize: "36px",
			color: "#ffffff",
		}
	).setOrigin(0.5, 0.5).setScrollFactor(0);

	tween(scene, {
		targets: textObj,
		x: scene.scale.width / 2,
		duration: 250,
		ease: "Expo.easeOut",
		onComplete: () => {
			tween(scene, {
				targets: textObj,
				ease: "Expo.easeIn",
				x: scene.scale.width + 300,
				delay: 500 / scene.state.options.speed,
				duration: 250 / scene.state.options.speed,
				onComplete: () => {
					textObj.destroy();
				}
			});
		}
	});

	await tween(scene, {
		targets: rect,
		alpha: 0.5,
		duration: 1000 / scene.state.options.speed,
		yoyo: true,
		onComplete: () => rect.destroy()
	});

}
