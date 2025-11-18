import * as c from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { getState } from "@Models/State";
import * as io from "@PhaserIO";

export let textEl: TextObj | null = null;
export const updatePrestigeDisplay = (newTotalPrestige: number): void => {
	textEl!.setText(newTotalPrestige.toString());
};
export const PRESTIGE_DISPLAY_X = c.SCREEN_WIDTH - 520;
export const PRESTIGE_DISPLAY_Y = 20;

export function create() {
	const initialPrestige = getState().gameData.player.prestige;

	const label_ = label();

	const text_ = text(initialPrestige, label_);

	const container = io.Container([label_, text_]);
	io.SetPosition(container, vec2(PRESTIGE_DISPLAY_X, PRESTIGE_DISPLAY_Y));

	return container;
}

function text(initialPrestige: number, label: Phaser.GameObjects.Text) {
	textEl = io.Text(initialPrestige.toString(), {
		...c.titleTextConfig,
		fontSize: "24px",
		color: "#ffffff",
	});
	io.SetPosition(textEl, vec2(label.width + 10, 0));
	io.Centralize(textEl);
	return textEl;
}

function label() {
	const label = io.Text("Prestige:", {
		...c.titleTextConfig,
		fontSize: "24px",
		color: "#ffffff",
	});
	io.Centralize(label);
	return label;
}
