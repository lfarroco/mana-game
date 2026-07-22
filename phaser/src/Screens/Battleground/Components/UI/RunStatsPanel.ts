import * as i18n from "@i18n/i18n";
import * as ResultsConfig from "../Results/ResultsConfig";
import * as Constants from "@Constants";
import { env } from "../../../../Env";

export function createRunStatsPanel(
	runStats = env.state.session.runStats
): Phaser.GameObjects.Container {

	if (!runStats) {
		throw new Error("RunStatsPanel: runStats is undefined");
	}

	const panelWidth = 700;
	const panelHeight = 700;
	const panelX = ResultsConfig.LEFT_PANEL_X;
	const panelY = Constants.MIDDLE_SCREEN_Y;

	const statLabel = (label: string, value: string | number, y: number) => {
		return [
			() => {
				const labelObj = io.Label(label);
				io.SetPosition(labelObj, [panelX - 150, y]);
				return labelObj;
			},
			() => {
				const valueObj = io.Label(value.toString());
				io.SetPosition(valueObj, [panelX + 100, y]);
				return valueObj;
			},
		];
	};

	const container = io.Container([
		io.BorderedRoundRect(
			[panelX, panelY],
			[panelWidth, panelHeight],
			ResultsConfig.RESULTS_PANEL.borderRadius,
			ResultsConfig.RESULTS_PANEL.backgroundColor,
			ResultsConfig.RESULTS_PANEL.backgroundAlpha
		),
		[
			() => io.Title1(i18n.t("run_stats.title")),
			(title) => io.SetPosition(title, [panelX, panelY - 300]),
			(title) => io.Centralize(title),
		],
		...statLabel(i18n.t("run_stats.damage_dealt"), runStats.damageDealt.toFixed(0), panelY - 200),
		...statLabel(i18n.t("run_stats.poison_dealt"), runStats.poisonDealt.toFixed(0), panelY - 150),
		...statLabel(i18n.t("run_stats.shield_dealt"), runStats.shieldDealt.toFixed(0), panelY - 100),
		...statLabel(i18n.t("run_stats.regen_dealt"), runStats.regenDealt.toFixed(0), panelY - 50),
		...statLabel(i18n.t("run_stats.heal_dealt"), runStats.healDealt.toFixed(0), panelY),
		...statLabel(
			i18n.t("run_stats.most_powerful_unit"),
			runStats.mostPowerfulUnit
				? `${i18n.getName(runStats.mostPowerfulUnit.cardId)} (${runStats.mostPowerfulUnit.power})`
				: "-",
			panelY + 50
		),
		...statLabel(i18n.t("run_stats.total_units_recruited"), runStats.totalUnitsRecruited, panelY + 150),
	]);

	return container;
}
