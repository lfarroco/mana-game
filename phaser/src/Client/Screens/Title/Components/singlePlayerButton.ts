import * as constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as getSinglePlayerData from "@Game/effects/getSinglePlayerData";
import * as startGame from "@Screens/Title/Effects/startGame";
import * as collectionButton from "Client/Screens/Title/Components/collectionButton";
import * as hideMainButtons from "../Effects/hideMainButtons";
import * as showMainButtons from "../Effects/showMainButtons";
import * as resumeSinglePlayerGame from "../Effects/resumeSinglePlayerGame";

let submenuContainer: Container;

export function render(y: number) {
	const title = io.i18n("title.singlePlayer");
	const description = io.i18n("title.tooltip.singlePlayer");

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
		text: io.i18n("title.resume"),
		position: [constants.MIDDLE_SCREEN_X, baseY],
		callback: resumeSinglePlayerGame.resumeSinglePlayerGame
	});

	if (!hasSavedRun) {
		io.Hide(resumeBtn.container);
		resumeBtn.disable();
	}

	const newRunBtn = UIButton.create({
		text: io.i18n("title.newRun"),
		position: [constants.MIDDLE_SCREEN_X, baseY + spacing],
		callback: () => {
			hideSinglePlayerSubmenu();
			void startGame.startGame({ isMultiplayer: false });
		},
	});

	const collectionBtn = collectionButton.collectionButton(baseY + spacing * 2);

	const backBtn = UIButton.create({
		text: io.i18n("title.back"),
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
