import * as UIButton from "@Components/Button/UIButton";
import * as c from "@Constants";
import * as i18n from "@i18n/i18n";
import { env, makeContainer, borderedRoundRect, centeredRect } from "@Env";
import { BattlegroundEvent } from "../../../Events";

export function create() {
	const btn = UIButton.create({
		text: i18n.t("ui.menu.button"),
		position: [c.BATTLEGROUND_BUTTON_X, c.BATTLEGROUND_BUTTON_MARGIN_TOP],
		callback: createPanel
	});

	return btn.container;
}

export function createPanel() {
	BattlegroundEvent.combatPauseRequested.emit();

	const panelWidth = 650;
	const panelHeight = 500;
	const panelX = c.MIDDLE_SCREEN_X;
	const panelY = 600;
	const startingY = panelY - 100;

	const buttonDefs: [string, () => void][] = [];

	buttonDefs.push([
		i18n.t("ui.menu.newRun"),
		BattlegroundEvent.newRunRequested.emit
	]);

	buttonDefs.push(
		[
			i18n.t("ui.menu.mainMenu"),
			BattlegroundEvent.mainMenuRequested.emit
		],
		[
			i18n.t("ui.menu.back"),
			() => {
				BattlegroundEvent.combatResumeRequested.emit();
				container.destroy(true);
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

	// Overlay background
	const overlayBg = centeredRect(env.scene, c.MIDDLE_SCREEN, c.WHOLE_SCREEN, 0x000000, 0.1);
	overlayBg.setInteractive(new Phaser.Geom.Rectangle(0, 0, c.SCREEN_WIDTH, c.SCREEN_HEIGHT), Phaser.Geom.Rectangle.Contains);

	// Panel background
	const panelBg = borderedRoundRect(env.scene, [panelX, panelY], [panelWidth, panelHeight], 10, 0x2c3e50, 1);

	// Title text
	const titleText = env.scene.add.text(0, 0, i18n.t("ui.menu.title"), c.titleTextConfig);
	titleText.setPosition(panelX, panelY - panelHeight / 2 + 50);
	titleText.setOrigin(0.5);

	const container = makeContainer(env.scene, [
		overlayBg,
		panelBg,
		titleText,
		...buttons,
	]);

	env.scene.children.bringToTop(container);

	return container;
}
