import * as UIButton from "Client/Components/UIButton";
import * as c from "@Constants/constants";
import * as Geometry from "@Models/Geometry";
import * as State from "@Models/State";
import * as i18n from "@i18n/i18n";
import * as BattlegroundNavigation from "../Navigation";

export function create() {
	const btn = UIButton.createUIButton({
		text: i18n.t("ui.menu.button"),
		position: Geometry.vec2(c.BATTLEGROUND_BUTTON_X, c.BATTLEGROUND_BUTTON_MARGIN_TOP),
		callback: createPanel
	});

	return btn.container;
}

export function createPanel() {
	const panelWidth = 650;
	const panelHeight = 500;
	const panelX = c.MIDDLE_SCREEN.x;
	const panelY = 600;
	const startingY = panelY - 100;

	const buttonDefs: [string, () => void][] = [];

	buttonDefs.push([
		i18n.t("ui.menu.newRun"),
		() => {
			State.resetState();
			void BattlegroundNavigation.startNewRun();
		},
	]);

	buttonDefs.push(
		[
			i18n.t("ui.menu.mainMenu"),
			() => {
				State.resetState();
				void BattlegroundNavigation.returnToMainMenu();
			},
		],
		[
			i18n.t("ui.menu.back"),
			() => {
				io.Destroy(container);
			},
		]
	);

	const buttons = buttonDefs.map(
		([label, callback], i) =>
			UIButton.createUIButton({
				text: label,
				position: Geometry.vec2(panelX, startingY + i * 100),
				callback: callback,
			}).container
	);

	const container = io.Container([
		[
			() => io.Rectangle(c.MIDDLE_SCREEN, c.WHOLE_SCREEN, 0x000000, 0.1),
			io.SetInteractiveRect(Geometry.size(c.SCREEN_WIDTH, c.SCREEN_HEIGHT)),
		],
		io.BorderedRoundRect(Geometry.vec2(panelX, panelY), Geometry.size(panelWidth, panelHeight), 10, 0x2c3e50, 1),
		[
			() => io.Text(i18n.t("ui.menu.title"), c.titleTextConfig),
			(title) => io.SetPosition(title, Geometry.vec2(panelX, panelY - panelHeight / 2 + 50)),
			(title) => io.Centralize(title),
		],
		...buttons,
	]);

	io.BringToTop(container);

	return container;
}
