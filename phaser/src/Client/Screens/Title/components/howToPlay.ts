import * as constants from "@Constants";
import * as TutorialOverlay from "Client/Screens/Title/Components/TutorialOverlay";
import * as i18n from "@i18n/i18n";

export function create() {
	const text = io.Title1(i18n.t("title.howToPlay"));
	io.SetPosition(text, [0, 80]);
	io.Centralize(text);
	io.Tween({
		targets: text,
		duration: 1000,
		ease: "Power1InOut",
		yoyo: true,
		repeat: -1,
		scale: 1.2,
	});

	const container = io.Container([text]);
	container.rotation = -0.1;
	container.x = constants.SCREEN_WIDTH - 200;
	container.y = constants.SCREEN_HEIGHT - 200;

	container.setInteractive(
		new Phaser.Geom.Rectangle(-100, -100, 200, 200),
		Phaser.Geom.Rectangle.Contains
	);

	container.on("pointerover", () => {
		container.scene.input.setDefaultCursor("pointer");
	});

	container.on("pointerout", () => {
		container.scene.input.setDefaultCursor("default");
	});

	container.on("pointerdown", () => {
		TutorialOverlay.openTutorial();
	});
}
