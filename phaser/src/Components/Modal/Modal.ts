import * as constants from "@Constants";
import * as BackgroundOverlay from "@Components/Overlay/BackgroundOverlay";
import * as Panel from "@Components/Panel/Panel";
import { env } from "@Env";

// Modal animation constants
const MODAL_SCALE_IN_DURATION_MS = 500;
const MODAL_OVERLAY_FADE_OUT_DURATION_MS = 150;

export type ModalConfig = {
	width: number;
	height: number;
	title?: string;
	panelConfig?: Omit<Panel.PanelConfig, "width" | "height">;
	overlayColor?: number;
	overlayAlpha?: number;
};

export type Modal = {
	container: Phaser.GameObjects.Container;
	panel: Panel.Panel;
	close: () => Promise<void>;
	onClose: Promise<void>;
};

export function createModal(config: ModalConfig): Modal {
	const { width, height, title, panelConfig, overlayColor, overlayAlpha } = config;

	const overlay = BackgroundOverlay.create({
		color: overlayColor,
		alpha: overlayAlpha ?? 0.85,
		interactive: true,
	});
	overlay.show();

	const panel = Panel.createPanel([0, 0], {
		width,
		height,
		...panelConfig,
	});

	const children: Phaser.GameObjects.GameObject[] = [panel.container];

	if (title) {
		const modalTitle = env.scene.add.text(0, 0, title, constants.titleTextConfig);
		modalTitle.setPosition(0, -height / 2 + 50);
		modalTitle.setOrigin(0.5);
		children.push(modalTitle);
	}

	const container = env.container(children);
	container.setPosition(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y);

	env.scene.children.bringToTop(container);

	container.setScale(0);
	env.scene.tweens.add({
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
