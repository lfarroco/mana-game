import * as constants from "@Constants/constants";
import * as io from "@PhaserIO";
import { getSeed } from "@Utils/Random";
import * as Phaser from "phaser";
import * as CrystalSelectionScene from "../CrystalSelectionScene";
import { keyboard } from "./keyboard";

export function seedInput() {
	const currentSeed = getSeed();

	const x = constants.SCREEN_WIDTH - 20;
	const y = constants.SCREEN_HEIGHT - 20;
	const width = 200;
	const height = 40;

	// Input Background
	const bg = io.scene.add.rectangle(x, y, width, height, 0x000000, 0.5)
		.setOrigin(1, 1)
		.setStrokeStyle(1, 0x888888)
		.setInteractive({ useHandCursor: true });

	// Seed Label
	io.Text("Seed: ", {
		...constants.defaultTextConfig,
		fontSize: "24px",
		color: "#ffffff",
	})
		.setOrigin(1, 0.5)
		.setPosition(x - width - 10, y - height / 2);

	// Seed Text
	CrystalSelectionScene.state.seedText = io
		.Text(`${currentSeed}`, {
			...constants.defaultTextConfig,
			fontSize: "24px",
			color: "#ffffff",
		})
		.setOrigin(1, 0.5)
		.setPosition(x - 20, y - height / 2);

	// Warning Text
	CrystalSelectionScene.state.seedWarningText = io
		.Text("Unlocks and stats disabled when using a custom seed", {
			...constants.defaultTextConfig,
			fontSize: "16px",
			color: "#ffff00",
		})
		.setOrigin(1, 0.5)
		.setPosition(x, y - height - 20)
		.setVisible(false);

	// Events
	bg.on("pointerdown", () => {
		keyboard(CrystalSelectionScene.state.seedText);
	});

	// Hover effects
	bg.on("pointerover", () => bg.setStrokeStyle(1, 0xffffff));
	bg.on("pointerout", () => bg.setStrokeStyle(1, 0x888888));

	io.scene.add.existing(CrystalSelectionScene.state.seedText);

	// Cleanup on scene shutdown
	io.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
		const existingKeyboard = document.getElementById("virtual-keyboard");
		if (existingKeyboard && document.body.contains(existingKeyboard)) {
			document.body.removeChild(existingKeyboard);
		}
	});
}
