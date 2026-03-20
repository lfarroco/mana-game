import { getCurrentScene } from "@Models/State";
import { createUIButton } from "@Components/UIButton";
import * as io from "@PhaserIO";
import * as constants from "@Constants/constants";
import { t } from "@i18n/i18n";
import { vec2 } from "@Models/Geometry";

// Result screen styling
const FADE_DURATION_MS = 500;
const FADE_COLOR = 0x000000;
const OVERLAY_COLOR = 0x000000;
const OVERLAY_ALPHA = 0.85;

// Result screen depths
const OVERLAY_DEPTH = 2000;
const TEXT_DEPTH = 2001;
const BUTTON_DEPTH = 2002;

// Result screen layout
const TITLE_FONT_SIZE = "96px";
const TITLE_Y_OFFSET = 100;
const SUBTITLE_FONT_SIZE = "32px";
const SUBTITLE_Y_OFFSET = 20;
const BUTTON_Y_OFFSET = 150;
const BUTTON_WIDTH = 300;

export async function showMatchResult(isVictory: boolean) {
	const scene = getCurrentScene();

	// Dim background
	await io.Fade(FADE_DURATION_MS, FADE_COLOR); // Actually fade out or just add overlay?
	// io.Fade fades the camera. We might want a semi-transparent rect instead.

	const overlay = scene.add.rectangle(
		constants.MIDDLE_SCREEN_X,
		constants.MIDDLE_SCREEN_Y,
		constants.SCREEN_WIDTH,
		constants.SCREEN_HEIGHT,
		OVERLAY_COLOR,
		OVERLAY_ALPHA
	);
	overlay.setDepth(OVERLAY_DEPTH);
	overlay.setInteractive(); // Block clicks

	const titleText = isVictory ? "VICTORY" : "GAME OVER";
	const color = isVictory ? "#ffd700" : "#ff0000";

	const title = io.Text(titleText, {
		...constants.titleTextConfig,
		fontSize: TITLE_FONT_SIZE,
		color: color,
	});
	io.SetPosition(
		title,
		vec2(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y - TITLE_Y_OFFSET)
	);
	io.Centralize(title);
	title.setDepth(TEXT_DEPTH);

	const subText = isVictory
		? "Legendary! You have conquered the arena."
		: "Defeat... Try again to claim glory.";

	const subtitle = io.Text(subText, {
		...constants.defaultTextConfig,
		fontSize: SUBTITLE_FONT_SIZE,
		color: "#ffffff",
	});
	io.SetPosition(
		subtitle,
		vec2(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y + SUBTITLE_Y_OFFSET)
	);
	io.Centralize(subtitle);
	subtitle.setDepth(TEXT_DEPTH);

	// Return to Title Button
	const btnPos = vec2(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y + BUTTON_Y_OFFSET);
	const btn = createUIButton(
		t("common.mainMenu") || "Main Menu", // Fallback if key missing
		btnPos,
		() => {
			scene.scene.start(constants.SCENE_KEYS.TITLE);
		},
		BUTTON_WIDTH
	);

	// Ensure button is on top
	btn.container.setDepth(BUTTON_DEPTH);
}
