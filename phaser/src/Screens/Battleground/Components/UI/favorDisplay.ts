import * as Constants from "@Constants";
import * as i18n from "@i18n/i18n";
import { env, makeContainer as container } from "@Env";

// E1 (docs/new-encounter-types.md): favor-token counter in the battleground
// HUD — shows how close the run is to the guaranteed silver shop.
let favorTextElement: TextObj | null = null;
const FAVOR_DISPLAY_X = 240;
const FAVOR_DISPLAY_Y = 80;

export function create() {
	const initialFavor = env.state.session.favorTokens ?? 0;

	const uiContainer = container([label_(), text_(initialFavor)]);
	uiContainer.setPosition(FAVOR_DISPLAY_X, FAVOR_DISPLAY_Y);

	return uiContainer;
}

export const updateFavorDisplay = (favor: number): void => {
	if (!favorTextElement) {
		return;
	}

	favorTextElement.setText(favor.toString());
};

function text_(initialFavor: number) {
	favorTextElement = env.scene.add.text(0, 0, initialFavor.toString(), {
		...Constants.titleTextConfig,
		fontSize: "24px",
		color: "#ffd700",
	});
	favorTextElement.setPosition(75, 0);
	favorTextElement.setOrigin(0.5);

	return favorTextElement;
}

function label_() {
	const label = env.scene.add.text(0, 0, i18n.t("ui.favor"), {
		...Constants.titleTextConfig,
		fontSize: "24px",
		color: "#ffffff",
	});
	label.setOrigin(0.5);
	return label;
}
