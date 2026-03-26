import * as io from "@PhaserIO";
import { size, vec2 } from "@Models/Geometry";
import { playSoundEffect } from "@Systems/AudioManager";
import { getCurrentScene } from "@Models/State";
import { titleTextConfig } from "@Constants/constants";

// Encounter card animation and layout constants
const ICON_BOUNCE_BASE_DURATION_MS = 2000;
const ICON_BOUNCE_RANDOM_RANGE_MS = 200;
const ICON_BOUNCE_Y_OFFSET = 10;
const ICON_SIZE = 120;
const ICON_X_OFFSET = 10;
const CARD_HOVER_ALPHA = 0.4;
const CARD_HOVER_ANIMATION_DURATION_MS = 400;
const CARD_BORDER_WIDTH = 3;
const CARD_BORDER_COLOR = 0xffffff;
const CARD_BORDER_ALPHA = 0.2;
const CARD_FOCUS_BORDER_COLOR = 0xffd700;
const CARD_FOCUS_BORDER_ALPHA = 1;
const TITLE_FONT_SIZE = "26px";
const LABEL_FONT_SIZE = "22px";

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

	const bg = io.Rectangle(vec2(x, y), dimensions, 0x1f1f1f, 1);
	const border = scene.add.graphics();
	let isFocused = false;

	const drawBorder = (color: number, alpha: number) => {
		border.clear();
		border.lineStyle(CARD_BORDER_WIDTH, color, alpha);
		border.strokeRoundedRect(
			x - width / 2,
			y - height / 2,
			width,
			height,
			12
		);
	};

	drawBorder(CARD_BORDER_COLOR, CARD_BORDER_ALPHA);

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
			align: "left",
			wordWrap: { width: textWidth },
		})
		.setOrigin(0, 0);

	const label = scene.add
		.rexBBCodeText(textX, y - height / 2 + 75, description, {
			fontSize: LABEL_FONT_SIZE,
			fontFamily: "Arimo",
			color: "#dddddd",
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

		io.Tween({
			targets: [bg],
			alpha: CARD_HOVER_ALPHA,
			duration: CARD_HOVER_ANIMATION_DURATION_MS,
			ease: "Linear",
		});
	});

	io.OnPointerOut(bg, () => {
		if (isFocused) {
			return;
		}

		io.Tween({
			targets: [bg],
			alpha: 1,
			duration: CARD_HOVER_ANIMATION_DURATION_MS,
			ease: "Linear",
		});
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
				bg.setAlpha(CARD_HOVER_ALPHA);
				drawBorder(CARD_FOCUS_BORDER_COLOR, CARD_FOCUS_BORDER_ALPHA);
				return;
			}

			bg.setAlpha(1);
			drawBorder(CARD_BORDER_COLOR, CARD_BORDER_ALPHA);
		},
		activate: async () => {
			playSoundEffect("sfx_unit_run_magical_4");
			await onClick();
		},
	};
}
