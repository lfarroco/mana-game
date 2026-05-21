import * as constants from "@Constants/constants";
import { createUIButton } from "@Components/UIButton";
import { loadGame } from "@Game/effects/loadGame";
import { getSavedData } from "@Game/effects/getSavedData";
import { startGame } from "@Game/effects/startGame";
import { t } from "@i18n/i18n";
import { vec2 } from "@Models/Geometry";
import { collectionButton } from "@Scenes/Title/components/collectionButton";
import { hideMainButtons, showMainButtons } from "@Scenes/Title/components/optionsButton";
import * as io from "@PhaserIO";

let submenuContainer: Container | null = null;

export function singlePlayerButton(y: number) {

    const title = t("title.singlePlayer");
    const description = t("title.tooltip.singlePlayer");

	return createUIButton(
        title,
		vec2(constants.MIDDLE_SCREEN_X, y),
		showSinglePlayerSubmenu,
		undefined,
		undefined,
		{
			title,
			description,
			position: "right",
		}
	);
}

function showSinglePlayerSubmenu() {
	if (submenuContainer) return;

	hideMainButtons();

	const baseY = 500;
	const spacing = 90;
	const hasSavedRun = getSavedData() != null;

	const startOrContinueBtn = createUIButton(
		t("title.startContinue"),
		vec2(constants.MIDDLE_SCREEN_X, baseY),
		() => {
			hideSinglePlayerSubmenu();
			if (hasSavedRun) {
                // TODO: create "loadSinglePlayerGame"
				loadGame();
				return;
			}

            // TODO: replace with new effect "startSinglePlayer"
			void startGame(false);
		}
	);

	const newRunBtn = createUIButton(
		t("title.newRun"),
		vec2(constants.MIDDLE_SCREEN_X, baseY + spacing),
		() => {
			hideSinglePlayerSubmenu();
			void startGame(false);
		}
	);

	const collectionBtn = collectionButton(baseY + spacing * 2);

	const returnBtn = createUIButton(
		t("title.return"),
		vec2(constants.MIDDLE_SCREEN_X, baseY + spacing * 3),
		() => {
			hideSinglePlayerSubmenu();
			showMainButtons();
		}
	);

	submenuContainer = io.Container([
		startOrContinueBtn.container,
		newRunBtn.container,
		collectionBtn.container,
		returnBtn.container,
	]);

	io.BringToTop(submenuContainer);
}

function hideSinglePlayerSubmenu() {
	if (!submenuContainer) {
		return;
	}

	submenuContainer.destroy(true);
	submenuContainer = null;
}
