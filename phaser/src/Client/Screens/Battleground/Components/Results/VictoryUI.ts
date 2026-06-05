import * as UIButton from "Client/Components/UIButton";
import * as c from "@Constants/constants";
import * as Geometry from "@Models/Geometry";
import * as Unit from "@Models/Entities/Unit";
import * as ResultsConfig from "./ResultsConfig";
import * as io from "@PhaserIO";
import * as CombatStatsTable from "./CombatStatsTable";
import * as i18n from "@i18n/i18n";

export async function displayVictory(
	units: Unit.Unit[],
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
			UIButton.createUIButton({
				text: label,
				position: Geometry.vec2(panelX, baseY - (totalButtons - 1 - index) * verticalSpacing),
				callback: callback,
			}).container
	);

	const { playerPanel, cpuPanel } = await CombatStatsTable.createCombatStatsPanels(units, panelX, panelY);

	const container = io.Container([
		io.BorderedRoundRect(
			Geometry.vec2(panelX, panelY),
			Geometry.size(panelWidth, panelHeight),
			ResultsConfig.RESULTS_PANEL.borderRadius,
			ResultsConfig.RESULTS_PANEL.backgroundColor,
			ResultsConfig.RESULTS_PANEL.backgroundAlpha
		),
		[
			() =>
				io.Text(i18n.t("results.titles.victory"), {
					...c.titleTextConfig,
					fontSize: ResultsConfig.RESULTS_FONT_SIZES.titleMedium,
					color: ResultsConfig.RESULTS_COLORS.victory,
				}),
			(title) =>
				io.SetPosition(title, Geometry.vec2(panelX, panelY - panelHeight / 2 + ResultsConfig.RESULTS_SPACING.titleY)),
			(title) => io.Centralize(title),
		],
		playerPanel,
		cpuPanel,
		...buttons,
	]);

	return container;
}
