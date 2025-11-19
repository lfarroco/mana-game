import * as c from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { getState } from "@Models/State";
import * as io from "@PhaserIO";

export let textEl: TextObj | null = null;
export const updateLivesDisplay = (newTotalLives: number): void => {
	textEl!.setText(newTotalLives.toString());
};
export const LIVES_DISPLAY_X = c.SCREEN_WIDTH - 520;
export const LIVES_DISPLAY_Y = 20;

export function create() {
	const initialLives = getState().gameData.player.lives;

	const label_ = label();

	const text_ = text(initialLives, label_);

	const container = io.Container([label_, text_]);
	io.SetPosition(container, vec2(LIVES_DISPLAY_X, LIVES_DISPLAY_Y));

	return container;
}

function text(initialLives: number, label: Phaser.GameObjects.Text) {
	textEl = io.Text(initialLives.toString(), {
		...c.titleTextConfig,
		fontSize: "24px",
		color: "#ffffff",
	});
	io.SetPosition(textEl, vec2(label.width + 10, 0));
	io.Centralize(textEl);
	return textEl;
}

function label() {
	const label = io.Text("Lives:", {
		...c.titleTextConfig,
		fontSize: "24px",
		color: "#ffffff",
	});
	io.Centralize(label);
	return label;
}
