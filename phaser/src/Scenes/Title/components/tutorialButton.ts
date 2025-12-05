import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import * as io from "@PhaserIO";
import { openTutorial } from "./TutorialOverlay";

export function tutorialButton() {
	const text = io.Title1("Tutorial");
	io.SetPosition(text, vec2(0, 0));
	io.Centralize(text);

	io.Tween({
		targets: text,
		duration: 1000,
		ease: "Power1InOut",
		yoyo: true,
		repeat: -1,
		scale: 1.1,
	});

	const container = io.Container([text]);
	container.rotation = 0.1;
	container.x = 200;
	container.y = constants.SCREEN_HEIGHT - 200;

	// Make the container interactive and clickable
	container.setInteractive(
		new Phaser.Geom.Rectangle(-100, -50, 200, 100),
		Phaser.Geom.Rectangle.Contains
	);

	// Add pointer cursor on hover
	container.on('pointerover', () => {
		container.scene.input.setDefaultCursor('pointer');
	});

	container.on('pointerout', () => {
		container.scene.input.setDefaultCursor('default');
	});

	// Open tutorial on click
	container.on('pointerdown', () => {
		openTutorial();
	});
}
