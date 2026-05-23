import * as c from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import * as io from "@PhaserIO";
import { createBackgroundOverlay } from "@Components/BackgroundOverlay";
import { createPanel, Panel, PanelConfig } from "@Components/Panel";

// Modal animation constants
const MODAL_SCALE_IN_DURATION_MS = 500;
const MODAL_OVERLAY_FADE_OUT_DURATION_MS = 150;

export type ModalConfig = {
	width: number;
	height: number;
	title?: string;
	panelConfig?: Omit<PanelConfig, "width" | "height">;
	overlayColor?: number;
	overlayAlpha?: number;
};

export type Modal = {
	container: Phaser.GameObjects.Container;
	panel: Panel;
	close: () => Promise<void>;
	onClose: Promise<void>;
};

export function createModal(config: ModalConfig): Modal {
	const { width, height, title, panelConfig, overlayColor, overlayAlpha } = config;

	const overlay = createBackgroundOverlay({
		color: overlayColor,
		alpha: overlayAlpha ?? 0.85,
		interactive: true,
	});
	overlay.show();

	const panel = createPanel(vec2(0, 0), {
		width,
		height,
		...panelConfig,
	});

	const children: Phaser.GameObjects.GameObject[] = [panel.container];

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
	io.scene.tweens.add({
		targets: container,
		scale: 1,
		duration: MODAL_SCALE_IN_DURATION_MS,
		ease: Phaser.Math.Easing.Back.Out,
	});

	let resolveClose: () => void;
	const onClose = new Promise<void>((resolve) => {
		resolveClose = resolve;
	});

	const close = async () => {
		await overlay.fadeOut(MODAL_OVERLAY_FADE_OUT_DURATION_MS);
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
