import * as io from "@PhaserIO";
import { size } from "@Models/Geometry";
import { playSoundEffect } from "@Systems/AudioManager";
import { getCurrentScene } from "@Models/State";
import { titleTextConfig } from "@Constants/constants";
import {
	mixHexColors,
	UI_SURFACE_ACTIVE_BORDER_WIDTH,
	UI_SURFACE_ALPHA,
	UI_SURFACE_BORDER_COLOR,
	UI_SURFACE_COLOR,
	UI_SURFACE_HOVER_COLOR,
	UI_SURFACE_HOVER_BORDER_COLOR,
	UI_TEXT_MUTED,
	UI_TEXT_PRIMARY,
} from "@UI/theme";

// Encounter card animation and layout constants
const ICON_BOUNCE_BASE_DURATION_MS = 2000;
const ICON_BOUNCE_RANDOM_RANGE_MS = 200;
const ICON_BOUNCE_Y_OFFSET = 10;
const ICON_SIZE = 120;
const ICON_X_OFFSET = 10;
const CARD_HOVER_COLOR_MIX = 1;
const CARD_HOVER_ANIMATION_DURATION_MS = 220;
const CARD_BORDER_WIDTH = 2;
const CARD_ACTIVE_BORDER_WIDTH = UI_SURFACE_ACTIVE_BORDER_WIDTH;
const CARD_BORDER_COLOR = UI_SURFACE_BORDER_COLOR;
const CARD_BORDER_ALPHA = 0.5;
const CARD_FOCUS_BORDER_COLOR = UI_SURFACE_HOVER_BORDER_COLOR;
const CARD_FOCUS_BORDER_ALPHA = 1;
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
	container: Phaser.GameObjects.Container,
	props: EncounterCardProps
) {
	const { x, y, width, height, name, pic, description, onClick } = props;
	const padding = 20;
	const dimensions = size(width, height);
	const scene = getCurrentScene();

	const bg = scene.add.graphics({ x: x - width / 2, y: y - height / 2 });
	const border = scene.add.graphics();
	let isFocused = false;
	const backgroundState = { mix: 0 };
	const drawBackground = () => {
		const fillColor = mixHexColors(UI_SURFACE_COLOR, UI_SURFACE_HOVER_COLOR, backgroundState.mix);
		bg.clear();
		bg.fillStyle(fillColor, UI_SURFACE_ALPHA);
		bg.fillRoundedRect(0, 0, width, height, CARD_CORNER_RADIUS);
	};
	const tweenBackground = (mix: number) => {
		scene.tweens.killTweensOf(backgroundState);
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
			x - width / 2,
			y - height / 2,
			width,
			height,
			CARD_CORNER_RADIUS
		);
	};

	drawBackground();
	drawBorder(CARD_BORDER_COLOR, CARD_BORDER_ALPHA, CARD_BORDER_WIDTH);

	const iconSize = ICON_SIZE;
	const iconX = x - width / 2 + padding + iconSize / 2 + ICON_X_OFFSET;
	const iconY = y;

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

	const textX = x - width / 2 + padding + iconSize + 20;
	const textWidth = width - (padding + iconSize + 40 + padding);

	const title = scene.add
		.text(textX - 8, y - height / 2 + 20, name, {
			...titleTextConfig,
			fontSize: TITLE_FONT_SIZE,
			color: UI_TEXT_PRIMARY,
			align: "left",
			wordWrap: { width: textWidth },
		})
		.setOrigin(0, 0);

	const label = scene.add
		.rexBBCodeText(textX, y - height / 2 + 75, description, {
			fontSize: LABEL_FONT_SIZE,
			fontFamily: "Arimo",
			color: UI_TEXT_MUTED,
			wrap: {
				mode: 1, // Word wrap
				width: textWidth,
			},
		})
		.setAlign("left")
		.setOrigin(0, 0);

	io.SetInteractiveRect(dimensions)(bg);

	io.OnPointerOver(bg, () => {
		if (isFocused) {
			return;
		}

		tweenBackground(CARD_HOVER_COLOR_MIX);
	});

	io.OnPointerOut(bg, () => {
		if (isFocused) {
			return;
		}

		tweenBackground(0);
	});

	io.OnPointerUp(bg, () => {
		playSoundEffect("sfx_unit_run_magical_4");
		onClick();
	});

	container.add([bg, border, icon, title, label]);

	return {
		bg,
		icon,
		title,
		label,
		setFocused: (focused: boolean) => {
			isFocused = focused;
			if (focused) {
				tweenBackground(CARD_HOVER_COLOR_MIX);
				drawBorder(CARD_FOCUS_BORDER_COLOR, CARD_FOCUS_BORDER_ALPHA, CARD_ACTIVE_BORDER_WIDTH);
				return;
			}

			tweenBackground(0);
			drawBorder(CARD_BORDER_COLOR, CARD_BORDER_ALPHA, CARD_BORDER_WIDTH);
		},
		activate: async () => {
			playSoundEffect("sfx_unit_run_magical_4");
			await onClick();
		},
	};
}
