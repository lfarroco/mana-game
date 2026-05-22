import * as constants from "@Constants/constants";
import { createUIButton } from "@Components/UIButton";
import { loadGame } from "@Game/effects/loadGame";
import { getSavedData } from "@Game/effects/getSavedData";
import { startGame } from "@Game/effects/startGame";
import { t } from "@i18n/i18n";
import { vec2 } from "@Models/Geometry";
import { collectionButton } from "Client/Scenes/Title/components/collectionButton";
import * as io from "@PhaserIO";
import * as TitleScene from "@Scenes/Title/TitleScene";

let submenuContainer: Container;

export function singlePlayerButton(y: number) {
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
	TitleScene.hideMainButtons();

	const baseY = 500;
	const spacing = 100;
	const hasSavedRun = getSavedData() != null;

	const resumeBtn = createUIButton({
		text: t("title.resume"),
		position: vec2(constants.MIDDLE_SCREEN_X, baseY),
		callback: () => {
			hideSinglePlayerSubmenu();
			loadGame();
		},
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
			void startGame(false);
		},
	});

	const collectionBtn = collectionButton(baseY + spacing * 2);

	const backBtn = createUIButton({
		text: t("title.back"),
		position: vec2(constants.MIDDLE_SCREEN_X, baseY + spacing * 3),
		callback: () => {
			hideSinglePlayerSubmenu();
			TitleScene.showMainButtons();
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
