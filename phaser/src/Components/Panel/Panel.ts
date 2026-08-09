import { env } from "@Env";

export type PanelConfig = {
	width: number;
	height: number;
	borderRadius?: number;
	backgroundColor?: number;
	backgroundAlpha?: number;
	borderWidth?: number;
	borderColor?: number;
	borderAlpha?: number;
};

const DEFAULT_CONFIG: Required<Omit<PanelConfig, "width" | "height">> = {
	borderRadius: 20,
	backgroundColor: 0x2c3e50,
	backgroundAlpha: 0.95,
	borderWidth: 2,
	borderColor: 0xffffff,
	borderAlpha: 0.5,
};

export type Panel = {
	container: Phaser.GameObjects.Container;
	background: Phaser.GameObjects.Graphics;
	width: number;
	height: number;
	add: (...children: Phaser.GameObjects.GameObject[]) => void;
	destroy: () => void;
};

export function createPanel(position: Vec2, config: PanelConfig): Panel {
	const {
		width,
		height,
		borderRadius,
		backgroundColor,
		backgroundAlpha,
		borderWidth,
		borderColor,
		borderAlpha,
	} = {
		...DEFAULT_CONFIG,
		...config,
	};

	const background = env.borderedRoundRect(
		position,
		[width, height],
		borderRadius,
		backgroundColor,
		backgroundAlpha
	);
	background.clear();
	background.lineStyle(borderWidth, borderColor, borderAlpha);
	background.fillStyle(backgroundColor, backgroundAlpha);
	background.fillRoundedRect(0, 0, width, height, borderRadius);
	background.strokeRoundedRect(0, 0, width, height, borderRadius);

	const container = env.container([background]);

	const add = (...children: Phaser.GameObjects.GameObject[]): void => {
		container.add(children);
	};

	const destroy = (): void => {
		container.destroy(true);
	};

	return {
		container,
		background,
		width,
		height,
		add,
		destroy,
	};
}
