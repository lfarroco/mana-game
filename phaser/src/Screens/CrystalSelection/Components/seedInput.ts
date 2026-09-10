import * as constants from "@Constants";
import * as keyboard from "./keyboard";
import { env } from "@Env";
import { isMultiplayerMode } from "@lib/multiplayerMode";

/**
 * Create the custom-seed input widget (label, value text, warning text and
 * the clickable field that opens the DOM numpad). Everything is added to the
 * scene, so Phaser destroys it on shutdown; the DOM keyboard is torn down by
 * the scene's `onScreenShutdown()` (`keyboard.destroy()`).
 */
export function create(): void {
	// Seed selection is server-determined in multiplayer — skip the custom seed UI.
	// The explicit mode flag covers the pre-session flow (no session exists yet
	// while picking a crystal); the session_type check covers a resumed run.
	if (isMultiplayerMode() || env.state.session.session_type.type === "multiplayer") {
		return;
	}

	const currentSeed = env.state.session.seed;

	const x = constants.SCREEN_WIDTH - 20;
	const y = constants.SCREEN_HEIGHT - 20;
	const width = 200;
	const height = 40;

	const bg = env.scene.add
		.rectangle(x, y, width, height, 0x000000, 0.5)
		.setOrigin(1, 1)
		.setStrokeStyle(1, 0x888888)
		.setInteractive({ useHandCursor: true });

	// "Seed: " label
	env.scene.add
		.text(0, 0, "Seed: ", {
			...constants.defaultTextConfig,
			fontSize: "24px",
			color: "#ffffff",
		})
		.setOrigin(1, 0.5)
		.setPosition(x - width - 10, y - height / 2);

	// Seed value text — passed to the keyboard for editing
	const seedText = env.scene.add
		.text(0, 0, `${currentSeed}`, {
			...constants.defaultTextConfig,
			fontSize: "24px",
			color: "#ffffff",
		})
		.setOrigin(1, 0.5)
		.setPosition(x - 20, y - height / 2);

	// Warning text — toggled by the keyboard
	const seedWarningText = env.scene.add
		.text(0, 0, "Unlocks and stats disabled when using a custom seed", {
			...constants.defaultTextConfig,
			fontSize: "16px",
			color: "#ffff00",
		})
		.setOrigin(1, 0.5)
		.setPosition(x, y - height - 20)
		.setVisible(false);

	// Events
	bg.on("pointerdown", () => {
		keyboard.create(seedText, seedWarningText);
	});

	// Hover effects
	bg.on("pointerover", () => bg.setStrokeStyle(1, 0xffffff));
	bg.on("pointerout", () => bg.setStrokeStyle(1, 0x888888));
}
