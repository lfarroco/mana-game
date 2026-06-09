import * as c from "@Constants";

// Default overlay styling
const DEFAULT_OVERLAY_COLOR = 0x000000;
const DEFAULT_OVERLAY_ALPHA = 0.7;
const DEFAULT_FADE_ANIMATION_DURATION_MS = 300;

export type BackgroundOverlayConfig = {
	color?: number;
	alpha?: number;
	interactive?: boolean;
};

const DEFAULT_CONFIG: Required<BackgroundOverlayConfig> = {
	color: DEFAULT_OVERLAY_COLOR,
	alpha: DEFAULT_OVERLAY_ALPHA,
	interactive: true,
};

export type BackgroundOverlay = {
	rectangle: Phaser.GameObjects.Rectangle;
	fadeIn: (duration?: number) => Promise<void>;
	fadeOut: (duration?: number) => Promise<void>;
	show: () => void;
	hide: () => void;
	destroy: () => void;
};

export function create(config: BackgroundOverlayConfig = {}): BackgroundOverlay {
	const { color, alpha, interactive } = { ...DEFAULT_CONFIG, ...config };

	const rectangle = io.scene.add.rectangle(
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

	const fadeIn = (duration: number = DEFAULT_FADE_ANIMATION_DURATION_MS): Promise<void> => {
		return new Promise((resolve) => {
			rectangle.setVisible(true);
			io.scene.tweens.add({
				targets: rectangle,
				alpha: alpha,
				duration,
				onComplete: () => resolve(),
			});
		});
	};

	const fadeOut = (duration: number = DEFAULT_FADE_ANIMATION_DURATION_MS): Promise<void> => {
		return new Promise((resolve) => {
			io.scene.tweens.add({
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
