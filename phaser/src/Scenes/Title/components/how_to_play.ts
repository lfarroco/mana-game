import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import * as io from "@PhaserIO";
import { images } from "../../../assets";

function openYouTubeLink(url: string) {
	if (typeof (window as any).openExternalURL === 'function') {
		(window as any).openExternalURL(url);
	} else {
		window.open(url, '_blank');
	}
}

export function how_to_play() {
	const YOUTUBE_URL = "https://youtube.com/live/F3xtoT-YwzU";

	const youtube_icon = io.Image(images.youtube_icon.key);
	io.SetPosition(youtube_icon,
		vec2(0, 0)
	);
	io.Centralize(youtube_icon);
	const text = io.Title1("How to play\n@manabattle");
	io.SetPosition(text,
		vec2(0, 80)
	);
	io.Centralize(text);
	io.Tween({
		targets: text,
		duration: 1000,
		ease: "Power1InOut",
		yoyo: true,
		repeat: -1,
		scale: 1.2,
	});

	const container = io.Container([youtube_icon, text]);
	container.rotation = -0.1;
	container.x = constants.SCREEN_WIDTH - 200;
	container.y = constants.SCREEN_HEIGHT - 200;

	// Make the container interactive and clickable
	container.setInteractive(
		new Phaser.Geom.Rectangle(-100, -100, 200, 200),
		Phaser.Geom.Rectangle.Contains
	);

	// Add pointer cursor on hover
	container.on('pointerover', () => {
		container.scene.input.setDefaultCursor('pointer');
	});

	container.on('pointerout', () => {
		container.scene.input.setDefaultCursor('default');
	});

	// Open YouTube link on click
	container.on('pointerdown', () => {
		openYouTubeLink(YOUTUBE_URL);
	});
}
