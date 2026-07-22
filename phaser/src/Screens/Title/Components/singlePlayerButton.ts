import * as constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as getSinglePlayerData from "../../../Storage/getSinglePlayerData";
import * as collectionButton from "../../../Screens/Title/Components/collectionButton";
import * as hideMainButtons from "../Effects/hideMainButtons";
import * as showMainButtons from "../Effects/showMainButtons";

let submenuContainer: Container;

export function create(y: number) {
	const title = io.i18n("title.singlePlayer");
	const description = io.i18n("title.tooltip.singlePlayer");

	return UIButton.create({
		text: title,
		position: [constants.MIDDLE_SCREEN_X, y],
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
		text: io.i18n("title.resume"),
		position: [constants.MIDDLE_SCREEN_X, baseY],
		callback: io.screens.title.events.resumeGameButtonClicked.emit
	});

	if (!hasSavedRun) {
		io.Hide(resumeBtn.container);
		resumeBtn.disable();
	}

	const newRunBtn = UIButton.create({
		text: io.i18n("title.newRun"),
		position: [constants.MIDDLE_SCREEN_X, baseY + spacing],
		callback: io.screens.title.events.newGameButtonClicked.emit
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
