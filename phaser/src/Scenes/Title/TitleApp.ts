import type { Element, ManaFC, ManaMsg } from '../../mana';
import { container } from '../../mana';
import * as manabutton from '../../mana/components/manabutton';
import { images } from '../../assets';

export type TitleMsg =
	| { type: 'START_GAME' }
	| { type: 'OPEN_OPTIONS' };

export type TitleProps = {
	centerX: number;
	centerY: number;
	logoOffsetY?: number;
	buttonSpacing?: number;
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
	logoOffsetY = 200,
	buttonSpacing = 80,
}) => {
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

	return [
		{
			...container<TitleMsg | ManaMsg>('title-root', 0, 0, children),
		},
	];
};
