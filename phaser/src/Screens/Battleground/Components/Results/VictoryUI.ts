import * as UIButton from "@Components/Button/UIButton";
import * as c from "@Constants";
import { Unit } from "@game/Models";
import * as ResultsConfig from "./ResultsConfig";
import * as CombatStatsTable from "./CombatStatsTable";
import * as i18n from "@i18n/i18n";
import { env, makeContainer as container, borderedRoundRect } from "@Env";

export async function displayVictory(
	units: Unit[],
	nextPhaseCallback: () => void,
	replayCallback?: () => void
): Promise<Phaser.GameObjects.Container> {
	const panelWidth = ResultsConfig.RESULTS_PANEL.width;
	const panelHeight = ResultsConfig.RESULTS_PANEL.height;
	const panelX = c.MIDDLE_SCREEN_X;
	const panelY = c.MIDDLE_SCREEN_Y;

	const buttonDefinitions: Array<[string, () => Promise<void>]> = [];

	if (replayCallback) {
		buttonDefinitions.push([
			i18n.t("results.buttons.replay"),
			async () => {
				replayCallback();
			},
		]);
	}

	buttonDefinitions.push([
		i18n.t("results.buttons.continue"),
		async () => {
			nextPhaseCallback();
		},
	]);

	const totalButtons = buttonDefinitions.length;
	const verticalSpacing = 75;
	const baseY = panelY + panelHeight / 2 - ResultsConfig.RESULTS_SPACING.buttonBottomOffset;

	const buttons = buttonDefinitions.map(
		([label, callback], index) =>
			UIButton.create({
				text: label,
				position: [
					panelX,
					baseY - (totalButtons - 1 - index) * verticalSpacing
				],
				callback: callback,
			}).container
	);

	const { playerPanel, cpuPanel } = await CombatStatsTable.createCombatStatsPanels(units, panelX, panelY);

	const resultContainer = container(env.scene, [
		borderedRoundRect(
			env.scene,
			[panelX, panelY],
			[panelWidth, panelHeight],
			ResultsConfig.RESULTS_PANEL.borderRadius,
			ResultsConfig.RESULTS_PANEL.backgroundColor,
			ResultsConfig.RESULTS_PANEL.backgroundAlpha
		),
		[
			() =>
				env.scene.add.text(0, 0, i18n.t("results.titles.victory"), {
					...c.titleTextConfig,
					fontSize: ResultsConfig.RESULTS_FONT_SIZES.titleMedium,
					color: ResultsConfig.RESULTS_COLORS.victory,
				}),
			(title) =>
				(title as Phaser.GameObjects.Text).setPosition(panelX, panelY - panelHeight / 2 + ResultsConfig.RESULTS_SPACING.titleY),
			(title) => (title as Phaser.GameObjects.Text).setOrigin(0.5),
		],
		playerPanel,
		cpuPanel,
		...buttons,
	]);

	return resultContainer;
}
