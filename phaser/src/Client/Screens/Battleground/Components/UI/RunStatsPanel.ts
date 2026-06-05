import { size, vec2 } from "@Models/Geometry";
import * as io from "@PhaserIO";
import { t, getName } from "@i18n/i18n";
import { LEFT_PANEL_X, RESULTS_PANEL } from "../Results/ResultsConfig";
import { MIDDLE_SCREEN_Y } from "@Constants/constants";


export function createRunStatsPanel(
	runStats = state.session.runStats
): Phaser.GameObjects.Container {

	if (!runStats) {
		throw new Error("RunStatsPanel: runStats is undefined");
	}

	const panelWidth = 700;
	const panelHeight = 700;
	const panelX = LEFT_PANEL_X;
	const panelY = MIDDLE_SCREEN_Y;

	const statLabel = (label: string, value: string | number, y: number) => {
		return [
			() => {
				const labelObj = io.Label(label);
				io.SetPosition(labelObj, vec2(panelX - 150, y));
				return labelObj;
			},
			() => {
				const valueObj = io.Label(value.toString());
				io.SetPosition(valueObj, vec2(panelX + 100, y));
				return valueObj;
			},
		];
	};

	const container = io.Container([
		io.BorderedRoundRect(
			vec2(panelX, panelY),
			size(panelWidth, panelHeight),
			RESULTS_PANEL.borderRadius,
			RESULTS_PANEL.backgroundColor,
			RESULTS_PANEL.backgroundAlpha
		),
		[
			() => io.Title1(t("run_stats.title")),
			(title) => io.SetPosition(title, vec2(panelX, panelY - 300)),
			(title) => io.Centralize(title),
		],
		...statLabel(t("run_stats.damage_dealt"), runStats.damageDealt.toFixed(0), panelY - 200),
		...statLabel(t("run_stats.poison_dealt"), runStats.poisonDealt.toFixed(0), panelY - 150),
		...statLabel(t("run_stats.shield_dealt"), runStats.shieldDealt.toFixed(0), panelY - 100),
		...statLabel(t("run_stats.regen_dealt"), runStats.regenDealt.toFixed(0), panelY - 50),
		...statLabel(t("run_stats.heal_dealt"), runStats.healDealt.toFixed(0), panelY),
		...statLabel(
			t("run_stats.most_powerful_unit"),
			runStats.mostPowerfulUnit
				? `${getName(runStats.mostPowerfulUnit.cardId)} (${runStats.mostPowerfulUnit.power})`
				: "-",
			panelY + 50
		),
		...statLabel(t("run_stats.total_units_recruited"), runStats.totalUnitsRecruited, panelY + 150),
	]);

	return container;
}
