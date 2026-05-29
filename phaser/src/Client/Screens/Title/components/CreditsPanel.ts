import * as c from "@Constants/constants";
import * as i18n from "@i18n/i18n";
import * as Geometry from "@Models/Geometry";
import * as UIButton from "@Components/UIButton";

// UI positioning
const OVERLAY_ALPHA = 0.85;
const PANEL_WIDTH = 800;
const PANEL_HEIGHT = 700;

let isOpen = false;

/**
 * Opens the credits panel overlay
 */
export function openCredits(): void {
	if (isOpen) return;
	isOpen = true;


	// Create dark overlay background
	const overlay = io.scene.add.rectangle(
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
		Geometry.vec2(c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y),
		{ width: PANEL_WIDTH, height: PANEL_HEIGHT },
		20,
		0x2c3e50,
		0.95
	);

	// Create title
	const title = io.Title1(i18n.t("credits.title"));
	io.SetPosition(title, Geometry.vec2(c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y - PANEL_HEIGHT / 2 + 70));
	io.Centralize(title);

	// Create credits text container - you can add your credits here
	const creditsContent = [
		i18n.t("credits.design"),
		"Mana Battle Team",
		"",
		i18n.t("credits.icons"),
		"Laura de Stefano Farroco",
		"",
		i18n.t("credits.assets"),
		"Duelyst Assets",
		"",
		i18n.t("credits.thanks"),
		"My daughter (Laura) and my wife (Ercilia)",
		"",
		i18n.t("credits.phaser"),
	];

	const creditsTexts = creditsContent.map((text, index) => {
		const isHeader = text && !creditsContent[index - 1]?.trim();
		const textObj = io.scene.add.text(c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y - 200 + index * 35, text, {
			...c.titleTextConfig,
			fontSize: isHeader ? "28px" : "22px",
			color: isHeader ? "#f1c40f" : "#ecf0f1",
		});
		textObj.setOrigin(0.5, 0.5);
		return textObj;
	});

	// Create close button
	const closeButton = UIButton.createUIButton({
		text: i18n.t("credits.close"),
		position: Geometry.vec2(c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y + PANEL_HEIGHT / 2 - 60),
		callback: () => {
			container.destroy(true);
			isOpen = false;
		},
	});

	// Create container for all elements
	const container = io.Container([overlay, panelBg, title, ...creditsTexts, closeButton.container]);

	io.BringToTop(container);
}
