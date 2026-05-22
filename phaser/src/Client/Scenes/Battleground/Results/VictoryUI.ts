import { createUIButton } from "@Components/UIButton";
import * as c from "@Constants/constants";
import { size, vec2 } from "@Models/Geometry";
import { Unit } from "@Models/Entities/Unit";
import {
	RESULTS_COLORS,
	RESULTS_FONT_SIZES,
	RESULTS_PANEL,
	RESULTS_SPACING,
} from "Client/Scenes/Battleground/Results/ResultsConfig";
import * as io from "@PhaserIO";
import { createCombatStatsPanels } from "Client/Scenes/Battleground/Results/CombatStatsTable";
import { t } from "@i18n/i18n";

export async function displayVictory(
	units: Unit[],
	nextPhaseCallback: () => void,
	replayCallback?: () => void
): Promise<Phaser.GameObjects.Container> {
	const panelWidth = RESULTS_PANEL.width;
	const panelHeight = RESULTS_PANEL.height;
	const panelX = c.MIDDLE_SCREEN_X;
	const panelY = c.MIDDLE_SCREEN_Y;

	const buttonDefinitions: Array<[string, () => Promise<void>]> = [];

	if (replayCallback) {
		buttonDefinitions.push([
			t("results.buttons.replay"),
			async () => {
				replayCallback();
			},
		]);
	}

	buttonDefinitions.push([
		t("results.buttons.continue"),
		async () => {
			nextPhaseCallback();
		},
	]);

	const totalButtons = buttonDefinitions.length;
	const verticalSpacing = 75;
	const baseY = panelY + panelHeight / 2 - RESULTS_SPACING.buttonBottomOffset;

	const buttons = buttonDefinitions.map(
		([label, callback], index) =>
			createUIButton(
				label,
				vec2(panelX, baseY - (totalButtons - 1 - index) * verticalSpacing),
				callback
			).container
	);

	const { playerPanel, cpuPanel } = await createCombatStatsPanels(units, panelX, panelY);

	const container = io.Container([
		io.BorderedRoundRect(
			vec2(panelX, panelY),
			size(panelWidth, panelHeight),
			RESULTS_PANEL.borderRadius,
			RESULTS_PANEL.backgroundColor,
			RESULTS_PANEL.backgroundAlpha
		),
		[
			() =>
				io.Text(t("results.titles.victory"), {
					...c.titleTextConfig,
					fontSize: RESULTS_FONT_SIZES.titleMedium,
					color: RESULTS_COLORS.victory,
				}),
			(title) =>
				io.SetPosition(title, vec2(panelX, panelY - panelHeight / 2 + RESULTS_SPACING.titleY)),
			(title) => io.Centralize(title),
		],
		playerPanel,
		cpuPanel,
		...buttons,
	]);

	return container;
}
