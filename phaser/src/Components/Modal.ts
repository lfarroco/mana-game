import * as c from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import * as io from "@PhaserIO";
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

	const panel = createPanel(vec2(c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y), {
		width,
		height,
	});

	const children: Phaser.GameObjects.GameObject[] = [
		overlay.rectangle,
		panel.container,
	];

	if (title) {
		const modalTitle = io.Title1(title);
		io.SetPosition(modalTitle, vec2(c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y - height / 2 + 50));
		io.Centralize(modalTitle);
		children.push(modalTitle);
	}

	const container = io.Container(children);
	io.BringToTop(container);

	let resolveClose: () => void;
	const onClose = new Promise<void>((resolve) => {
		resolveClose = resolve;
	});

	const close = async () => {
		await overlay.fadeOut(150);
		container.destroy(true);
		resolveClose();
	};

	return {
		container,
		panel,
		close,
		onClose,
	};
}
