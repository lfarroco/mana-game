import * as UIButton from "@Components/Button/UIButton";
import * as c from "@Constants";
import * as i18n from "@i18n/i18n";
import { env, makeContainer, borderedRoundRect, centeredRect } from "@Env";
import { BattlegroundEvent } from "../../../Events";

const PANEL_WIDTH = 650;
const PANEL_HEIGHT = 500;
const PANEL_X = c.MIDDLE_SCREEN_X;
const PANEL_Y = 600;
const BUTTON_SPACING = 100;

/** [label, callback] pairs rendered top-to-bottom, centered in the panel. */
type ButtonDef = [label: string, callback: () => void];

export function create() {
	const btn = UIButton.create({
		text: i18n.t("ui.menu.button"),
		position: [c.BATTLEGROUND_BUTTON_X, c.BATTLEGROUND_BUTTON_MARGIN_TOP],
		callback: createPanel,
	});

	return btn.container;
}

export function createPanel() {
	BattlegroundEvent.combatPauseRequested.emit();

	return showMenu();
}

/**
 * The menu panel. "New run" and "Main menu" must not discard the current run
 * on a single click, so they hand off to `showConfirmation` first; "Back"
 * closes the menu and resumes combat immediately.
 */
function showMenu(): Phaser.GameObjects.Container {
	let menu: Phaser.GameObjects.Container;

	const requestWithConfirmation = (onConfirm: () => void) => {
		menu.destroy(true);
		showConfirmation(onConfirm, () => {
			menu = showMenu();
		});
	};

	menu = createPanelContainer(i18n.t("ui.menu.title"), [
		[
			i18n.t("ui.menu.newRun"),
			() => requestWithConfirmation(() => BattlegroundEvent.newRunRequested.emit()),
		],
		[
			i18n.t("ui.menu.mainMenu"),
			() => requestWithConfirmation(() => BattlegroundEvent.mainMenuRequested.emit()),
		],
		[
			i18n.t("ui.menu.back"),
			() => {
				BattlegroundEvent.combatResumeRequested.emit();
				menu.destroy(true);
			},
		],
	]);

	return menu;
}

/** Yes/No confirmation, laid out exactly like the menu panel it replaces. */
function showConfirmation(
	onConfirm: () => void,
	onCancel: () => void
): Phaser.GameObjects.Container {
	const confirmation = createPanelContainer(i18n.t("ui.menu.confirmTitle"), [
		[
			i18n.t("ui.menu.yes"),
			() => {
				confirmation.destroy(true);
				onConfirm();
			},
		],
		[
			i18n.t("ui.menu.no"),
			() => {
				confirmation.destroy(true);
				onCancel();
			},
		],
	]);

	return confirmation;
}

/**
 * Shared layout for the menu and its confirmation: a full-screen click catcher,
 * a centered bordered panel, a title, and vertically centered buttons.
 */
function createPanelContainer(
	title: string,
	buttonDefs: ButtonDef[]
): Phaser.GameObjects.Container {
	// Overlay background
	const overlayBg = centeredRect(env.scene, c.MIDDLE_SCREEN, c.WHOLE_SCREEN, 0x000000, 0.1);
	overlayBg.setInteractive(
		new Phaser.Geom.Rectangle(0, 0, c.SCREEN_WIDTH, c.SCREEN_HEIGHT),
		Phaser.Geom.Rectangle.Contains
	);

	// Panel background
	const panelBg = borderedRoundRect(
		env.scene,
		[PANEL_X, PANEL_Y],
		[PANEL_WIDTH, PANEL_HEIGHT],
		10,
		0x2c3e50,
		1
	);

	// Title text
	const titleText = env.scene.add.text(0, 0, title, c.titleTextConfig);
	titleText.setPosition(PANEL_X, PANEL_Y - PANEL_HEIGHT / 2 + 50);
	titleText.setOrigin(0.5);

	const startingY = PANEL_Y - ((buttonDefs.length - 1) * BUTTON_SPACING) / 2;
	const buttons = buttonDefs.map(
		([label, callback], i) =>
			UIButton.create({
				text: label,
				position: [PANEL_X, startingY + i * BUTTON_SPACING],
				callback: callback,
			}).container
	);

	const container = makeContainer([overlayBg, panelBg, titleText, ...buttons]);

	env.scene.children.bringToTop(container);

	return container;
}
