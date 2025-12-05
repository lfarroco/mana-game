import * as c from "@Constants/constants";
import { getCurrentScene } from "@Models/State";

export type BackgroundOverlayConfig = {
	color?: number;
	alpha?: number;
	interactive?: boolean;
}

const DEFAULT_CONFIG: Required<BackgroundOverlayConfig> = {
	color: 0x000000,
	alpha: 0.7,
	interactive: true,
};

export type BackgroundOverlay = {
	rectangle: Phaser.GameObjects.Rectangle;
	fadeIn: (duration?: number) => Promise<void>;
	fadeOut: (duration?: number) => Promise<void>;
	show: () => void;
	hide: () => void;
	destroy: () => void;
}

export function createBackgroundOverlay(config: BackgroundOverlayConfig = {}): BackgroundOverlay {
	const scene = getCurrentScene();
	const { color, alpha, interactive } = { ...DEFAULT_CONFIG, ...config };

	const rectangle = scene.add.rectangle(
		c.MIDDLE_SCREEN_X,
		c.MIDDLE_SCREEN_Y,
		c.SCREEN_WIDTH,
		c.SCREEN_HEIGHT,
		color,
		alpha
	);

	if (interactive) {
		rectangle.setInteractive();
	}

	rectangle.setAlpha(0);
	rectangle.setVisible(false);

	const fadeIn = (duration: number = 300): Promise<void> => {
		return new Promise((resolve) => {
			rectangle.setVisible(true);
			scene.tweens.add({
				targets: rectangle,
				alpha: alpha,
				duration,
				onComplete: () => resolve(),
			});
		});
	};

	const fadeOut = (duration: number = 300): Promise<void> => {
		return new Promise((resolve) => {
			scene.tweens.add({
				targets: rectangle,
				alpha: 0,
				duration,
				onComplete: () => {
					rectangle.setVisible(false);
					resolve();
				},
			});
		});
	};

	const show = (): void => {
		rectangle.setVisible(true);
		rectangle.setAlpha(alpha);
	};

	const hide = (): void => {
		rectangle.setVisible(false);
		rectangle.setAlpha(0);
	};

	const destroy = (): void => {
		rectangle.destroy();
	};

	return {
		rectangle,
		fadeIn,
		fadeOut,
		show,
		hide,
		destroy,
	};
}
