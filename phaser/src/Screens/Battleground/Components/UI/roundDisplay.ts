import * as Constants from "@Constants";
import * as i18n from "@i18n/i18n";
import { env } from "../../../../Env";

export let roundTextElement: TextObj | null = null;
const ROUND_DISPLAY_X = -70;
const ROUND_DISPLAY_Y = 50;

export function create() {
	const initialRound = env.state.session.round;

	const label = label_();

	const text_ = text(initialRound);

	const container = io.Container([label, text_]);
	io.SetPosition(container, [ROUND_DISPLAY_X, ROUND_DISPLAY_Y]);

	return container;
}

export const updateRoundDisplay = (newTotalRound: number): void => {
	if (!roundTextElement) {
		return;
	}

	roundTextElement.setText(newTotalRound.toString());
};

function text(initialRound: number) {
	roundTextElement = io.Text(initialRound.toString(), {
		...Constants.titleTextConfig,
		fontSize: "24px",
		color: "#ffffff",
	});
	io.SetPosition(roundTextElement, [75, 0]);
	io.Centralize(roundTextElement);

	return roundTextElement;
}

function label_() {
	const label = io.Text(i18n.t("ui.round"), {
		...Constants.titleTextConfig,
		fontSize: "24px",
		color: "#ffffff",
	});
	io.Centralize(label);
	return label;
}
