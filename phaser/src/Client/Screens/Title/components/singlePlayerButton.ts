import * as constants from "@Constants/constants";
import { createUIButton } from "Client/Components/UIButton";
import { getSinglePlayerData } from "@Game/effects/getSinglePlayerData";
import { startGame } from "@Screens/Title/Effects/startGame";
import { t } from "@i18n/i18n";
import { vec2 } from "@Models/Geometry";
import { collectionButton } from "Client/Screens/Title/Components/collectionButton";
import * as io from "@PhaserIO";
import * as hideMainButtons from "../Effects/hideMainButtons";
import * as showMainButtons from "../Effects/showMainButtons";
import * as resumeSinglePlayerGame from "../Effects/resumeSinglePlayerGame";

let submenuContainer: Container;

export function render(y: number) {
	const title = t("title.singlePlayer");
	const description = t("title.tooltip.singlePlayer");

	return createUIButton({
		text: title,
		position: vec2(constants.MIDDLE_SCREEN_X, y),
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
	const hasSavedRun = getSinglePlayerData() != null;

	const resumeBtn = createUIButton({
		text: t("title.resume"),
		position: vec2(constants.MIDDLE_SCREEN_X, baseY),
		callback: resumeSinglePlayerGame.resumeSinglePlayerGame
	});

	if (!hasSavedRun) {
		io.Hide(resumeBtn.container);
		resumeBtn.disable();
	}

	const newRunBtn = createUIButton({
		text: t("title.newRun"),
		position: vec2(constants.MIDDLE_SCREEN_X, baseY + spacing),
		callback: () => {
			hideSinglePlayerSubmenu();
			void startGame({ isMultiplayer: false });
		},
	});

	const collectionBtn = collectionButton(baseY + spacing * 2);

	const backBtn = createUIButton({
		text: t("title.back"),
		position: vec2(constants.MIDDLE_SCREEN_X, baseY + spacing * 3),
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
