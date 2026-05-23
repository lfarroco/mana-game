import { createUIButton } from "@Components/UIButton";
import * as c from "@Constants/constants";
import { size, vec2 } from "@Models/Geometry";
import { resetState, State } from "@Models/State";
import * as io from "@PhaserIO";
import { t } from "@i18n/i18n";
import { getGameController } from "@Core/GameControllerFactory";
//TODO: this should be local
import * as constants from "@Constants/constants";

export function create(state: State) {
	const btn = createUIButton({
		text: t("ui.menu.button"),
		position: vec2(constants.BATTLEGROUND_BUTTON_X, constants.BATTLEGROUND_BUTTON_MARGIN_TOP),
		callback: () => {
			createPanel(state);
		},
	});

	return btn.container;
}

export function createPanel(_state: State) {
	const panelWidth = 650;
	const panelHeight = 500;
	const panelX = c.MIDDLE_SCREEN.x;
	const panelY = 600;
	const startingY = panelY - 100;

	const buttonDefs: [string, () => void][] = [];

	const controller = getGameController();
	if (controller.isFeatureEnabled("new_run_button")) {
		buttonDefs.push([
			t("ui.menu.newRun"),
			() => {
				resetState();
				//getCurrentScene().game.scene.start(c.SCENE_KEYS.CRYSTAL_SELECTION);
			},
		]);
	}

	buttonDefs.push(
		[
			t("ui.menu.mainMenu"),
			() => {
				resetState();
				//getCurrentScene().scene.stop(getCurrentScene().scene.key);
				//getCurrentScene().game.scene.start(c.SCENE_KEYS.TITLE);
			},
		],
		[
			t("ui.menu.back"),
			() => {
				io.Destroy(container);
			},
		]
	);

	const buttons = buttonDefs.map(
		([label, callback], i) =>
			createUIButton({
				text: label,
				position: vec2(panelX, startingY + i * 100),
				callback: callback,
			}).container
	);

	const container = io.Container([
		[
			() => io.Rectangle(c.MIDDLE_SCREEN, c.WHOLE_SCREEN, 0x000000, 0.1),
			io.SetInteractiveRect(size(c.SCREEN_WIDTH, c.SCREEN_HEIGHT)),
		],
		io.BorderedRoundRect(vec2(panelX, panelY), size(panelWidth, panelHeight), 10, 0x2c3e50, 1),
		[
			() => io.Text(t("ui.menu.title"), c.titleTextConfig),
			(title) => io.SetPosition(title, vec2(panelX, panelY - panelHeight / 2 + 50)),
			(title) => io.Centralize(title),
		],
		...buttons,
	]);

	io.BringToTop(container);

	return container;
}
