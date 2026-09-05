import * as constants from "@Constants";
import * as i18n from "@i18n/i18n";
import * as Modal from "@Components/Modal/Modal";
import * as UIButton from "@Components/Button/UIButton";
import { env } from "@Env";

const MODAL_WIDTH = 700;
const MODAL_HEIGHT = 620;

/**
 * Rating explainer modal for the multiplayer lobby — how the rating changes
 * at the end of a run (wins-based deltas, never down) and what seasons are.
 * Opened from the "?" button next to the rating in the profile panel.
 */
export function open(): void {
	const modal = Modal.createModal({
		width: MODAL_WIDTH,
		height: MODAL_HEIGHT,
		title: i18n.t("lobby.ratingHelpTitle"),
	});

	// Centered below the title (which sits at -height/2 + 50): the extra gap
	// keeps the title clear of the first body line in every locale.
	const body = env.scene.add
		.text(0, 10, i18n.t("lobby.ratingHelpBody"), {
			...constants.defaultTextConfig,
			fontSize: "20px",
			color: "#ffffff",
			align: "left",
			wordWrap: { width: MODAL_WIDTH - 100 },
			lineSpacing: 6,
		})
		.setOrigin(0.5);

	const okButton = UIButton.create({
		text: i18n.t("lobby.back"),
		position: [0, 250],
		width: 200,
		callback: () => {
			void modal.close();
		},
	});

	modal.container.add([body, okButton.container]);
}
