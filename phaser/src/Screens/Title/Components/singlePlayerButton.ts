import * as constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as getSinglePlayerData from "../../../Storage/getSinglePlayerData";
import * as collectionButton from "../../../Screens/Title/Components/collectionButton";
import * as hideMainButtons from "../Effects/hideMainButtons";
import * as showMainButtons from "../Effects/showMainButtons";
import * as i18n from "@i18n/i18n";
import * as TitleScreen from "../TitleScreen";
import { env } from "@Env";

let submenuContainer: Container;

const BUTTON_Y = 500;

export function create() {
	const title = i18n.t("title.singlePlayer");
	const description = i18n.t("title.tooltip.singlePlayer");

	return UIButton.create({
		text: title,
		position: [constants.MIDDLE_SCREEN_X, BUTTON_Y],
		callback: showSinglePlayerSubmenu(),
		tooltip: {
			title,
			description,
			position: "right",
		},
	});
}

const showSinglePlayerSubmenu = () => () => {
	hideMainButtons.hideMainButtons();

	const baseY = 500;
	const spacing = 100;
	const hasSavedRun = getSinglePlayerData.getSinglePlayerData() != null;

	const resumeBtn = UIButton.create({
		text: i18n.t("title.resume"),
		position: [constants.MIDDLE_SCREEN_X, baseY],
		callback: TitleScreen.events.resumeGameButtonClicked.emit
	});

	if (!hasSavedRun) {
		resumeBtn.container.setVisible(false);
		resumeBtn.disable();
	}

	const newRunBtn = UIButton.create({
		text: i18n.t("title.newRun"),
		position: [constants.MIDDLE_SCREEN_X, baseY + spacing],
		callback: TitleScreen.events.newGameButtonClicked.emit
	});

	const collectionBtn = collectionButton.collectionButton(baseY + spacing * 2);

	const backBtn = UIButton.create({
		text: i18n.t("title.back"),
		position: [constants.MIDDLE_SCREEN_X, baseY + spacing * 3],
		callback: () => {
			hideSinglePlayerSubmenu();
			showMainButtons.showMainButtons();
		},
	});

	submenuContainer = env.container([
		resumeBtn.container,
		newRunBtn.container,
		collectionBtn.container,
		backBtn.container,
	]);

	env.scene.children.bringToTop(submenuContainer);
}

function hideSinglePlayerSubmenu() {
	submenuContainer.destroy(true);
}
