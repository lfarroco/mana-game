import * as Constants from "@Constants";
import * as i18n from "@i18n/i18n";
import { env, makeContainer as container } from "@Env";

let roundTextElement: TextObj | null = null;
const ROUND_DISPLAY_X = -70;
const ROUND_DISPLAY_Y = 50;

export function create() {
	const initialRound = env.state.session.round;

	const label = label_();

	const text_ = text(initialRound);

	const uiContainer = container([label, text_]);
	uiContainer.setPosition(ROUND_DISPLAY_X, ROUND_DISPLAY_Y);

	return uiContainer;
}

export const updateRoundDisplay = (newTotalRound: number): void => {
	if (!roundTextElement) {
		return;
	}

	roundTextElement.setText(newTotalRound.toString());
};

function text(initialRound: number) {
	roundTextElement = env.scene.add.text(0, 0, initialRound.toString(), {
		...Constants.titleTextConfig,
		fontSize: "24px",
		color: "#ffffff",
	});
	roundTextElement.setPosition(75, 0);
	roundTextElement.setOrigin(0.5);

	return roundTextElement;
}

function label_() {
	const label = env.scene.add.text(0, 0, i18n.t("ui.round"), {
		...Constants.titleTextConfig,
		fontSize: "24px",
		color: "#ffffff",
	});
	label.setOrigin(0.5);
	return label;
}
