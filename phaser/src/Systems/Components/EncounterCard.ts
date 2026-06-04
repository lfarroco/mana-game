import * as io from "@PhaserIO";
import * as Geometry from "@Models/Geometry";
import * as AudioManager from "@Systems/AudioManager";
import * as constants from "@Constants/constants";
import * as theme from "@Screens/Battleground/Components/UI/theme";

// Encounter card animation and layout constants
const ICON_BOUNCE_BASE_DURATION_MS = 2000;
const ICON_BOUNCE_RANDOM_RANGE_MS = 200;
const ICON_BOUNCE_Y_OFFSET = 10;
const ICON_SIZE = 120;
const ICON_X_OFFSET = 10;
const CARD_HOVER_COLOR_MIX = 1;
const CARD_HOVER_ANIMATION_DURATION_MS = 220;
const CARD_BORDER_WIDTH = 2;
const CARD_BORDER_COLOR = theme.UI_SURFACE_BORDER_COLOR;
const CARD_BORDER_ALPHA = 0.5;
const TITLE_FONT_SIZE = "26px";
const LABEL_FONT_SIZE = "22px";
const CARD_CORNER_RADIUS = 12;

type EncounterCardProps = {
	x: number;
	y: number;
	width: number;
	height: number;
	name: string;
	pic: string;
	description: string;
	onClick: () => void | Promise<void>;
};

export function createEncounterCard(
	parent: Phaser.GameObjects.Container,
	props: EncounterCardProps
) {
	const container = io.Container();
	const { x, y, width, height, name, pic, description, onClick } = props;

	io.SetPosition(container, { x, y });
	const padding = 20;
	const dimensions = Geometry.size(width, height);

	const bg = io.scene.add.graphics({ x: - width / 2, y: - height / 2 });
	const border = io.scene.add.graphics();
	const backgroundState = { mix: 0 };
	const drawBackground = () => {
		const fillColor = theme.mixHexColors(theme.UI_SURFACE_COLOR, theme.UI_SURFACE_HOVER_COLOR, backgroundState.mix);
		bg.clear();
		bg.fillStyle(fillColor, theme.UI_SURFACE_ALPHA);
		bg.fillRoundedRect(0, 0, width, height, CARD_CORNER_RADIUS);
	};
	const tweenBackground = (mix: number) => {
		io.scene.tweens.killTweensOf(backgroundState);
		io.Tween({
			targets: backgroundState,
			mix,
			duration: CARD_HOVER_ANIMATION_DURATION_MS,
			ease: "Sine.easeOut",
			onUpdate: drawBackground,
		});
	};

	const drawBorder = (color: number, alpha: number, lineWidth: number) => {
		border.clear();
		border.lineStyle(lineWidth, color, alpha);
		border.strokeRoundedRect(
			- width / 2,
			- height / 2,
			width,
			height,
			CARD_CORNER_RADIUS
		);
	};

	drawBackground();
	drawBorder(CARD_BORDER_COLOR, CARD_BORDER_ALPHA, CARD_BORDER_WIDTH);

	const iconSize = ICON_SIZE;
	const iconX = - width / 2 + padding + iconSize / 2 + ICON_X_OFFSET;
	const iconY = 0;

	const icon = io
		.Image(pic)
		.setDisplaySize(iconSize, iconSize)
		.setPosition(iconX, iconY + ICON_BOUNCE_Y_OFFSET);

	io.Tween({
		targets: [icon],
		repeat: -1,
		duration: ICON_BOUNCE_RANDOM_RANGE_MS * Math.random() + ICON_BOUNCE_BASE_DURATION_MS,
		ease: "Linear",
		yoyo: true,
		y: {
			from: iconY,
			to: iconY + ICON_BOUNCE_Y_OFFSET,
		},
	});

	const textX = - width / 2 + padding + iconSize + 20;
	const textWidth = width - (padding + iconSize + 40 + padding);

	const title = io.scene.add
		.text(textX - 8, - height / 2 + 20, name, {
			...constants.titleTextConfig,
			fontSize: TITLE_FONT_SIZE,
			color: theme.UI_TEXT_PRIMARY,
			align: "left",
			wordWrap: { width: textWidth },
		})
		.setOrigin(0, 0);

	const label = io.scene.add
		.rexBBCodeText(textX, - height / 2 + 75, description, {
			fontSize: LABEL_FONT_SIZE,
			fontFamily: "Arimo",
			color: theme.UI_TEXT_MUTED,
			wrap: {
				mode: 1, // Word wrap
				width: textWidth,
			},
		})
		.setAlign("left")
		.setOrigin(0, 0);

	io.SetInteractiveRect(dimensions)(bg);

	io.OnPointerOver(bg, () => {
		tweenBackground(CARD_HOVER_COLOR_MIX);
	});

	io.OnPointerOut(bg, () => {
		tweenBackground(0);
		drawBorder(CARD_BORDER_COLOR, CARD_BORDER_ALPHA, CARD_BORDER_WIDTH);
	});

	io.OnPointerUp(bg, () => {
		AudioManager.playSoundEffect("sfx_unit_run_magical_4");
		onClick();
	});

	container.add([bg, border, icon, title, label]);
	parent.add(container);

	return {
		bg,
		border,
		container,
		icon,
		title,
		label,
		allObjects: [bg, border, icon, title, label],
		activate: async () => {
			AudioManager.playSoundEffect("sfx_unit_run_magical_4");
			await onClick();
		},
	};
}
