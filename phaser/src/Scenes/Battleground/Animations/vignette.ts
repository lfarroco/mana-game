import { tween } from "@Utils/animation";
import { COLOR_BLACK } from "../../../Utils/colors";
import { scene } from "../BattlegroundScene";
import * as c from "@Constants/constants";

// display a text in the center of the screen, with a fading gradient rect behind it
export const renderVignette = async ({ message }: { message: string }) => {
	const rect = scene.add
		.rectangle(0, c.MIDDLE_SCREEN_Y, c.MIDDLE_SCREEN_X, 100, COLOR_BLACK)
		.setOrigin(0, 0)
		.setAlpha(0)
		.setScrollFactor(0);

	const textObj = scene.add
		.text(-c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y + 50, message, c.defaultTextConfig)
		.setOrigin(0.5, 0.5)
		.setScrollFactor(0);

	tween({
		targets: [textObj],
		x: c.MIDDLE_SCREEN_X,
		onComplete: () => {
			tween({
				targets: [textObj],
				ease: "Expo.easeIn",
				x: c.SCREEN_WIDTH + c.MIDDLE_SCREEN_X,
				delay: 500,
				duration: 250,
			});
		},
	});

	await tween({
		targets: [rect],
		alpha: 0.5,
		duration: 1000,
		yoyo: true,
	});

	rect.destroy();
	textObj.destroy();
};
