import * as io from "@PhaserIO";
import { size } from "@Models/Geometry";

export type PanelConfig = {
	width: number;
	height: number;
	borderRadius?: number;
	backgroundColor?: number;
	backgroundAlpha?: number;
}

const DEFAULT_CONFIG: Required<Omit<PanelConfig, 'width' | 'height'>> = {
	borderRadius: 20,
	backgroundColor: 0x2c3e50,
	backgroundAlpha: 0.95,
};

export type Panel = {
	container: Phaser.GameObjects.Container;
	background: Phaser.GameObjects.Graphics;
	width: number;
	height: number;
	add: (...children: Phaser.GameObjects.GameObject[]) => void;
	destroy: () => void;
}

export function createPanel(position: Vec2, config: PanelConfig): Panel {
	const { width, height, borderRadius, backgroundColor, backgroundAlpha } = {
		...DEFAULT_CONFIG,
		...config,
	};

	const background = io.BorderedRoundRect(
		position,
		size(width, height),
		borderRadius,
		backgroundColor,
		backgroundAlpha
	);

	const container = io.Container([background]);

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
