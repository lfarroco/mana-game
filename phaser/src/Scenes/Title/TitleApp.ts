import type { Element, ManaFC, ManaMsg } from '../../mana';
import { container, useScene } from '../../mana';
import * as manabutton from '../../mana/components/manabutton';
import { images } from '../../assets';
import type * as Phaser from 'phaser';
import { colorPresets } from '../../constants/colorPresets';
import { cloudsBackgroundShader } from '../../Shaders/CloudsBackground';
import { getOption } from '@Models/OptionsStore';

export type TitleMsg =
	| { type: 'START_GAME' }
	| { type: 'OPEN_OPTIONS' };

export type TitleProps = {
	centerX: number;
	centerY: number;
	sceneWidth: number;
	sceneHeight: number;
	logoOffsetY?: number;
	buttonSpacing?: number;
};

export type TitleCloudsBackgroundHandle = {
	updateParticleQuality: () => void;
	destroy: () => void;
};

const getParticleQualityValue = (): number => {
	const particles = getOption('particles');
	switch (particles) {
		case 'low':
			return 0.0;
		case 'high':
			return 2.0;
		case 'medium':
		default:
			return 1.0;
	}
};

type TitleButtonProps = {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	text: string;
	fillColor: number;
	message: TitleMsg;
};

const createTitleButton = ({
	id,
	x,
	y,
	width,
	height,
	text,
	fillColor,
	message,
}: TitleButtonProps): readonly Element<TitleMsg | ManaMsg>[] => {
	return manabutton.create<TitleMsg | ManaMsg>({
		id,
		x,
		y,
		width,
		height,
		text,
		states: {
			normal: { fillColor },
		},
		onClick: () => [message],
	});
};

export const TitleApp: ManaFC<TitleProps, TitleMsg> = ({
	centerX,
	centerY,
	sceneWidth,
	sceneHeight,
	logoOffsetY = 200,
	buttonSpacing = 80,
}) => {
	const scene = useScene();
	const preset = colorPresets.nebula;

	const backgroundUniforms = {
		color1: preset.color1,
		color2: preset.color2,
		color3: preset.color3,
		color4: preset.color4,
		color5: preset.color5,
		timeScale: 1.0,
		particleQuality: getParticleQualityValue(),
		resolution: { x: sceneWidth, y: sceneHeight },
	};

	const background: Element<TitleMsg | ManaMsg> = {
		id: 'title-clouds-background',
		type: 'shader',
		x: centerX,
		y: centerY,
		width: sceneWidth,
		height: sceneHeight,
		fragmentShader: cloudsBackgroundShader,
		uniforms: backgroundUniforms,
		origin: { x: 0.5, y: 0.5 },
		alpha: 1,
		onMount: (gameObject) => {
			const shader = gameObject as Phaser.GameObjects.Shader;
			shader.setDepth(-1000);
			shader.setSize(sceneWidth, sceneHeight);
			(shader as any).alpha = 1;

			const sceneWithBackground = scene as Phaser.Scene & {
				cloudsBackground?: TitleCloudsBackgroundHandle;
			};

			let destroyed = false;
			const handle: TitleCloudsBackgroundHandle = {
				updateParticleQuality: () => {
					if (destroyed) {
						return;
					}
					shader.setUniform('particleQuality.value', getParticleQualityValue());
				},
				destroy: () => {
					if (destroyed) {
						return;
					}
					destroyed = true;
					if (sceneWithBackground.cloudsBackground === handle) {
						delete sceneWithBackground.cloudsBackground;
					}
					if (shader.scene) {
						shader.destroy();
					}
				},
			};

			if (sceneWithBackground.cloudsBackground && sceneWithBackground.cloudsBackground !== handle) {
				sceneWithBackground.cloudsBackground.destroy();
			}
			sceneWithBackground.cloudsBackground = handle;
			handle.updateParticleQuality();

			shader.once('destroy', () => {
				if (!destroyed) {
					destroyed = true;
				}
				if (sceneWithBackground.cloudsBackground === handle) {
					delete sceneWithBackground.cloudsBackground;
				}
			});
		},
	};

	const startButton = createTitleButton({
		id: 'start-game-button',
		x: centerX,
		y: centerY + buttonSpacing,
		width: 300,
		height: 60,
		text: 'START GAME',
		fillColor: 0x4a5568,
		message: { type: 'START_GAME' },
	});

	const optionsButton = createTitleButton({
		id: 'options-button',
		x: centerX,
		y: centerY + buttonSpacing + 80,
		width: 260,
		height: 54,
		text: 'OPTIONS',
		fillColor: 0x2d3748,
		message: { type: 'OPEN_OPTIONS' },
	});

	const logo: Element<TitleMsg | ManaMsg> = {
		id: 'title-logo',
		type: 'image',
		x: centerX,
		y: centerY - logoOffsetY,
		texture: images.logo.key,
		origin: { x: 0.5, y: 0.5 },
	};

	const children: Element<TitleMsg | ManaMsg>[] = [
		logo,
		...startButton,
		...optionsButton,
	];

	const uiContainer = {
		...container<TitleMsg | ManaMsg>('title-root', 0, 0, children),
	};

	return [background, uiContainer];
};
