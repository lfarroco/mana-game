import * as UIButton from "@Components/Button/UIButton";
import * as c from "@Constants";
import * as i18n from "@i18n/i18n";
import { requestMainMenu, requestNewRun } from "../../../GameController";

export function create() {
	const btn = UIButton.create({
		text: i18n.t("ui.menu.button"),
		position: [c.BATTLEGROUND_BUTTON_X, c.BATTLEGROUND_BUTTON_MARGIN_TOP],
		callback: createPanel
	});

	return btn.container;
}

export function createPanel() {
	io.screens.battleground.events.combatPauseRequested.emit();

	const panelWidth = 650;
	const panelHeight = 500;
	const panelX = c.MIDDLE_SCREEN_X;
	const panelY = 600;
	const startingY = panelY - 100;

	const buttonDefs: [string, () => void][] = [];

	buttonDefs.push([
		i18n.t("ui.menu.newRun"),
		() => {
			requestNewRun();
		},
	]);

	buttonDefs.push(
		[
			i18n.t("ui.menu.mainMenu"),
			() => {
				requestMainMenu();
			},
		],
		[
			i18n.t("ui.menu.back"),
			() => {
				io.screens.battleground.events.combatResumeRequested.emit(undefined);
				io.Destroy(container);
			},
		]
	);

	const buttons = buttonDefs.map(
		([label, callback], i) =>
			UIButton.create({
				text: label,
				position: [panelX, startingY + i * 100],
				callback: callback,
			}).container
	);

	const container = io.Container([
		[
			() => io.Rectangle(c.MIDDLE_SCREEN, c.WHOLE_SCREEN, 0x000000, 0.1),
			io.SetInteractiveRect([c.SCREEN_WIDTH, c.SCREEN_HEIGHT]),
		],
		io.BorderedRoundRect([panelX, panelY], [panelWidth, panelHeight], 10, 0x2c3e50, 1),
		[
			() => io.Text(i18n.t("ui.menu.title"), c.titleTextConfig),
			(title) => io.SetPosition(title, [panelX, panelY - panelHeight / 2 + 50]),
			(title) => io.Centralize(title),
		],
		...buttons,
	]);

	io.BringToTop(container);

	return container;
}
