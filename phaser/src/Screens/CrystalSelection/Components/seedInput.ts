import * as constants from "@Constants";
import * as parent from "../CrystalSelectionScreen";
import * as keyboard from "./keyboard";
import { env } from "../../../Env";

let seedText: Phaser.GameObjects.Text;

export function create() {
	const currentSeed = env.state.session.seed;

	const x = constants.SCREEN_WIDTH - 20;
	const y = constants.SCREEN_HEIGHT - 20;
	const width = 200;
	const height = 40;

	const bg = env.scene.add.rectangle(x, y, width, height, 0x000000, 0.5)
		.setOrigin(1, 1)
		.setStrokeStyle(1, 0x888888)
		.setInteractive({ useHandCursor: true });

	env.scene.add.text(0, 0, "Seed: ", {
		...constants.defaultTextConfig,
		fontSize: "24px",
		color: "#ffffff",
	})
		.setOrigin(1, 0.5)
		.setPosition(x - width - 10, y - height / 2);

	seedText = env.scene.add.text(0, 0, `${currentSeed}`, {
			...constants.defaultTextConfig,
			fontSize: "24px",
			color: "#ffffff",
		})
		.setOrigin(1, 0.5)
		.setPosition(x - 20, y - height / 2);

	parent.state.seedWarningText = env.scene.add.text(0, 0, "Unlocks and stats disabled when using a custom seed", {
			...constants.defaultTextConfig,
			fontSize: "16px",
			color: "#ffff00",
		})
		.setOrigin(1, 0.5)
		.setPosition(x, y - height - 20)
		.setVisible(false);

	// Events
	bg.on("pointerdown", () => {
		keyboard.create(seedText);
	});

	// Hover effects
	bg.on("pointerover", () => bg.setStrokeStyle(1, 0xffffff));
	bg.on("pointerout", () => bg.setStrokeStyle(1, 0x888888));

	env.scene.add.existing(seedText);

	// Cleanup on scene shutdown
	env.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
		const existingKeyboard = document.getElementById("virtual-keyboard");
		if (existingKeyboard && document.body.contains(existingKeyboard)) {
			document.body.removeChild(existingKeyboard);
		}
	});
}
