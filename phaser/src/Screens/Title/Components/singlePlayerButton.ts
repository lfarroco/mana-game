import * as constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as getSinglePlayerData from "../../../Storage/getSinglePlayerData";
import * as collectionButton from "../../../Screens/Title/Components/collectionButton";
import * as i18n from "@i18n/i18n";
import * as TitleScreen from "../TitleScreen";
import { env } from "@Env";

const BUTTON_Y = 500;

export function create(ctx: TitleScreen.Context) {
	const title = i18n.t("title.singlePlayer");
	const description = i18n.t("title.tooltip.singlePlayer");

	return UIButton.create({
		text: title,
		position: [constants.MIDDLE_SCREEN_X, BUTTON_Y],
		callback: () => {
			void ctx.go("submenu");
		},
		tooltip: {
			title,
			description,
			position: "right",
		},
	});
}

/**
 * Render the single-player submenu (Resume / New Run / Collection / Back).
 * Called by TitleScreen's "submenu" phase handler — the container is tracked
 * by the phase tracker and destroyed automatically on the next transition.
 *
 * The Resume/New Run callbacks don't switch back to the "main" phase before
 * emitting: the emitted event triggers navigation, which destroys the whole
 * screen anyway (destroy() runs before the fade-out starts).
 */
export function createSinglePlayerSubmenu(ctx: TitleScreen.Context) {
	const baseY = 500;
	const spacing = 100;
	const hasSavedRun = getSinglePlayerData.getSinglePlayerData() != null;

	const resumeBtn = UIButton.create({
		text: i18n.t("title.resume"),
		position: [constants.MIDDLE_SCREEN_X, baseY],
		callback: () => {

			ctx.events.resumeGameButtonClicked.emit()
		}
	});

	if (!hasSavedRun) {
		resumeBtn.container.setVisible(false);
		resumeBtn.disable();
	}

	const newRunBtn = UIButton.create({
		text: i18n.t("title.newRun"),
		position: [constants.MIDDLE_SCREEN_X, baseY + spacing],
		callback: () => {
			ctx.events.newGameButtonClicked.emit()
		}
	});

	const collectionBtn = collectionButton.collectionButton(baseY + spacing * 2);

	const backBtn = UIButton.create({
		text: i18n.t("title.back"),
		position: [constants.MIDDLE_SCREEN_X, baseY + spacing * 3],
		callback: () => {
			void ctx.go("main");
		},
	});

	const submenu = env.container([
		resumeBtn.container,
		newRunBtn.container,
		collectionBtn.container,
		backBtn.container,
	]);
	ctx.track(submenu);

	env.scene.children.bringToTop(submenu);
}
