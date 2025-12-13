import * as c from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import * as io from "@PhaserIO";
import { getCurrentScene } from "@Models/State";
import { createBackgroundOverlay } from "./BackgroundOverlay";
import { createPanel, Panel } from "./Panel";

export type ModalConfig = {
	width: number;
	height: number;
	title?: string;
};

export type Modal = {
	container: Phaser.GameObjects.Container;
	panel: Panel;
	close: () => Promise<void>;
	onClose: Promise<void>;
};

export function createModal(config: ModalConfig): Modal {
	const { width, height, title } = config;

	const overlay = createBackgroundOverlay({
		alpha: 0.85,
		interactive: true,
	});
	overlay.show();

	const panel = createPanel(vec2(0, 0), {
		width,
		height,
	});

	const children: Phaser.GameObjects.GameObject[] = [
		panel.container,
	];

	if (title) {
		const modalTitle = io.Title1(title);
		io.SetPosition(modalTitle, vec2(0, -height / 2 + 50));
		io.Centralize(modalTitle);
		children.push(modalTitle);
	}

	const container = io.Container(children);
	container.setPosition(c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y);

	io.BringToTop(container);

	container.setScale(0);
	const scene = getCurrentScene();
	scene.tweens.add({
		targets: container,
		scale: 1,
		duration: 500,
		ease: Phaser.Math.Easing.Back.Out,
	});

	let resolveClose: () => void;
	const onClose = new Promise<void>((resolve) => {
		resolveClose = resolve;
	});

	const close = async () => {
		await overlay.fadeOut(150);
		container.destroy(true);
		overlay.destroy();
		resolveClose();
	};

	return {
		container,
		panel,
		close,
		onClose,
	};
}
