import { getCurrentScene } from "@Models/State";
import { createUIButton } from "@Components/UIButton";
import * as io from "@PhaserIO";
import * as constants from "@Constants/constants";
import { t } from "@i18n/i18n";
import { vec2 } from "@Models/Geometry";

export async function showMatchResult(isVictory: boolean) {
	const scene = getCurrentScene();

	// Dim background
	await io.Fade(500, 0x000000); // Actually fade out or just add overlay? 
	// io.Fade fades the camera. We might want a semi-transparent rect instead.

	const overlay = scene.add.rectangle(
		constants.MIDDLE_SCREEN_X,
		constants.MIDDLE_SCREEN_Y,
		constants.SCREEN_WIDTH,
		constants.SCREEN_HEIGHT,
		0x000000,
		0.85
	);
	overlay.setDepth(2000);
	overlay.setInteractive(); // Block clicks

	const titleText = isVictory ? "VICTORY" : "GAME OVER";
	const color = isVictory ? "#ffd700" : "#ff0000";

	const title = io.Text(titleText, {
		...constants.titleTextConfig,
		fontSize: "96px",
		color: color
	});
	io.SetPosition(title, vec2(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y - 100));
	io.Centralize(title);
	title.setDepth(2001);

	const subText = isVictory
		? "Legendary! You have conquered the arena."
		: "Defeat... Try again to claim glory.";

	const subtitle = io.Text(subText, {
		...constants.defaultTextConfig,
		fontSize: "32px",
		color: "#ffffff"
	});
	io.SetPosition(subtitle, vec2(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y + 20));
	io.Centralize(subtitle);
	subtitle.setDepth(2001);

	// Return to Title Button
	const btnPos = vec2(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y + 150);
	const btn = createUIButton(
		t("common.mainMenu") || "Main Menu", // Fallback if key missing
		btnPos,
		() => {
			scene.scene.start(constants.SCENE_KEYS.TITLE);
		},
		300
	);

	// Ensure button is on top
	btn.container.setDepth(2002);
}
