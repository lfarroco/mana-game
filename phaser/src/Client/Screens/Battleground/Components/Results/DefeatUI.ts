import * as UIButton from "@Components/Button/UIButton";
import * as c from "@Constants";
import * as Unit from "@Models/Entities/Unit";
import * as ResultsConfig from "./ResultsConfig";
import * as CombatStatsTable from "./CombatStatsTable";
import * as i18n from "@i18n/i18n";

export async function displayDefeat(
	livesChange: number,
	units: Unit.Unit[],
	nextPhaseCallback: () => void,
	replayCallback?: () => void
): Promise<Phaser.GameObjects.Container> {
	const panelWidth = ResultsConfig.RESULTS_PANEL.width;
	const panelHeight = ResultsConfig.RESULTS_PANEL.height;
	const panelX = c.MIDDLE_SCREEN_X;
	const panelY = c.MIDDLE_SCREEN_Y;

	const livesValue = (livesChange > 0 ? "+" : "") + livesChange;
	const livesText = i18n.t("results.lives", { value: livesValue });
	const livesColor = livesChange > 0 ? "#4CAF50" : "#F44336";

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
				callback,
			}).container
	);

	const { playerPanel, cpuPanel } = await CombatStatsTable.createCombatStatsPanels(units, panelX, panelY);

	const container = io.Container([
		io.BorderedRoundRect(
			[panelX, panelY],
			[panelWidth, panelHeight],
			ResultsConfig.RESULTS_PANEL.borderRadius,
			ResultsConfig.RESULTS_PANEL.backgroundColor,
			ResultsConfig.RESULTS_PANEL.backgroundAlpha
		),
		[
			() =>
				io.Text(i18n.t("results.titles.defeat"), {
					...c.titleTextConfig,
					fontSize: ResultsConfig.RESULTS_FONT_SIZES.titleMedium,
					color: ResultsConfig.RESULTS_COLORS.defeat,
				}),
			(title) =>
				io.SetPosition(title, [panelX, panelY - panelHeight / 2 + ResultsConfig.RESULTS_SPACING.titleY]),
			(title) => io.Centralize(title),
		],
		[
			() =>
				io.Text(livesText, {
					...c.defaultTextConfig,
					fontSize: ResultsConfig.RESULTS_FONT_SIZES.messageSmall,
					color: livesColor,
					fontStyle: "bold",
				}),
			(label) => io.SetPosition(label, [panelX, panelY - panelHeight / 2 + 160]),
			(label) => io.Centralize(label),
		],
		playerPanel,
		cpuPanel,
		...buttons,
	]);

	return container;
}
