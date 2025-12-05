import * as c from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import * as io from "@PhaserIO";
import { getState } from "@Models/State";

export let roundTextElement: TextObj | null = null;
const ROUND_DISPLAY_X = -70;
const ROUND_DISPLAY_Y = 50;

export function create() {
	const initialRound = getState().gameData.round;

	const label = label_();

	const text_ = text(initialRound);

	const container = io.Container([label, text_]);
	io.SetPosition(container, vec2(ROUND_DISPLAY_X, ROUND_DISPLAY_Y));

	return container;
}

export const updateRoundDisplay = (newTotalRound: number): void => {
	roundTextElement!.setText(newTotalRound.toString());
};

function text(initialRound: number) {
	roundTextElement = io.Text(initialRound.toString(), {
		...c.titleTextConfig,
		fontSize: "24px",
		color: "#ffffff",
	});
	io.SetPosition(roundTextElement, vec2(75, 0));
	io.Centralize(roundTextElement);

	return roundTextElement;
}

function label_() {
	const label = io.Text("Round:", {
		...c.titleTextConfig,
		fontSize: "24px",
		color: "#ffffff",
	});
	io.Centralize(label);
	return label;
}
