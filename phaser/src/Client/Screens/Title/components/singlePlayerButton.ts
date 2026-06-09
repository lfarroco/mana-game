import * as constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as getSinglePlayerData from "@Game/effects/getSinglePlayerData";
import * as startGame from "@Screens/Title/Effects/startGame";
import * as i18n from "@i18n/i18n";
import * as collectionButton from "Client/Screens/Title/Components/collectionButton";
import * as hideMainButtons from "../Effects/hideMainButtons";
import * as showMainButtons from "../Effects/showMainButtons";
import * as resumeSinglePlayerGame from "../Effects/resumeSinglePlayerGame";

let submenuContainer: Container;

export function render(y: number) {
	const title = i18n.t("title.singlePlayer");
	const description = i18n.t("title.tooltip.singlePlayer");

	return UIButton.create({
		text: title,
		position: [constants.MIDDLE_SCREEN_X, y],
		callback: showSinglePlayerSubmenu,
		tooltip: {
			title,
			description,
			position: "right",
		},
	});
}

function showSinglePlayerSubmenu() {
	hideMainButtons.hideMainButtons();

	const baseY = 500;
	const spacing = 100;
	const hasSavedRun = getSinglePlayerData.getSinglePlayerData() != null;

	const resumeBtn = UIButton.create({
		text: i18n.t("title.resume"),
		position: [constants.MIDDLE_SCREEN_X, baseY],
		callback: resumeSinglePlayerGame.resumeSinglePlayerGame
	});

	if (!hasSavedRun) {
		io.Hide(resumeBtn.container);
		resumeBtn.disable();
	}

	const newRunBtn = UIButton.create({
		text: i18n.t("title.newRun"),
		position: [constants.MIDDLE_SCREEN_X, baseY + spacing],
		callback: () => {
			hideSinglePlayerSubmenu();
			void startGame.startGame({ isMultiplayer: false });
		},
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

	submenuContainer = io.Container([
		resumeBtn.container,
		newRunBtn.container,
		collectionBtn.container,
		backBtn.container,
	]);

	io.BringToTop(submenuContainer);
}

function hideSinglePlayerSubmenu() {
	submenuContainer.destroy(true);
}
