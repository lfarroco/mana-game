import * as c from "@Constants/constants";
import { t } from "@i18n/i18n";
import { vec2 } from "@Models/Geometry";
import { getCurrentScene } from "@Models/State";
import * as io from "@PhaserIO";
import { createUIButton } from "@Components/UIButton";

// UI positioning
const OVERLAY_ALPHA = 0.85;
const PANEL_WIDTH = 800;
const PANEL_HEIGHT = 600;

let isOpen = false;

/**
 * Opens the credits panel overlay
 */
export function openCredits(): void {
	if (isOpen) return;
	isOpen = true;

	const scene = getCurrentScene();

	// Create dark overlay background
	const overlay = scene.add.rectangle(
		c.MIDDLE_SCREEN_X,
		c.MIDDLE_SCREEN_Y,
		c.SCREEN_WIDTH,
		c.SCREEN_HEIGHT,
		0x000000,
		OVERLAY_ALPHA
	);
	overlay.setInteractive(); // Block clicks to elements behind

	// Create panel background
	const panelBg = io.BorderedRoundRect(
		vec2(c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y),
		{ width: PANEL_WIDTH, height: PANEL_HEIGHT },
		20,
		0x2c3e50,
		0.95
	);

	// Create title
	const title = io.Title1(t("credits.title"));
	io.SetPosition(title, vec2(c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y - PANEL_HEIGHT / 2 + 20));
	io.Centralize(title);

	// Create credits text container - you can add your credits here
	const creditsContent = [
		t("credits.design"),
		"Leonardo Farroco",
		"",
		t("credits.assets"),
		"Duelyst Assets",
		"",
		t("credits.thanks"),
		"My daughter (Laura) and my wife (Ercilia)",
	];

	const creditsTexts = creditsContent.map((text, index) => {
		const isHeader = text && !creditsContent[index - 1]?.trim();
		const textObj = scene.add.text(
			c.MIDDLE_SCREEN_X,
			c.MIDDLE_SCREEN_Y - 120 + index * 35,
			text,
			{
				fontFamily: "Arial",
				fontSize: isHeader ? "28px" : "22px",
				color: isHeader ? "#f1c40f" : "#ecf0f1",
				fontStyle: isHeader ? "bold" : "normal",
			}
		);
		textObj.setOrigin(0.5, 0.5);
		return textObj;
	});

	// Create close button
	const closeButton = createUIButton(
		t("credits.close"),
		vec2(c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y + PANEL_HEIGHT / 2 - 60),
		() => {
			container.destroy(true);
			isOpen = false;
		}
	);

	// Create container for all elements
	const container = io.Container([
		overlay,
		panelBg,
		title,
		...creditsTexts,
		closeButton.container,
	]);

	io.BringToTop(container);
}
