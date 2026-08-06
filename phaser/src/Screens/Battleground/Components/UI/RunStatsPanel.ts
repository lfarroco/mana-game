import * as i18n from "@i18n/i18n";
import * as ResultsConfig from "../Results/ResultsConfig";
import * as Constants from "@Constants";
import { env, makeContainer as container, borderedRoundRect } from "@Env";

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
				const labelObj = env.scene.add.text(0, 0, label, Constants.defaultTextConfig);
				labelObj.setPosition(panelX - 150, y);
				return labelObj;
			},
			() => {
				const valueObj = env.scene.add.text(0, 0, value.toString(), Constants.defaultTextConfig);
				valueObj.setPosition(panelX + 100, y);
				return valueObj;
			},
		];
	};

	const panelContainer = container([
		borderedRoundRect(
			env.scene,
			[panelX, panelY],
			[panelWidth, panelHeight],
			ResultsConfig.RESULTS_PANEL.borderRadius,
			ResultsConfig.RESULTS_PANEL.backgroundColor,
			ResultsConfig.RESULTS_PANEL.backgroundAlpha
		),
		[
			() => env.scene.add.text(0, 0, i18n.t("run_stats.title"), Constants.titleTextConfig),
			(title) => (title as Phaser.GameObjects.Text).setPosition(panelX, panelY - 300),
			(title) => (title as Phaser.GameObjects.Text).setOrigin(0.5),
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

	return panelContainer;
}
