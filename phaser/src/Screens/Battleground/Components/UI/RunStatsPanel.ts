import * as i18n from "@i18n/i18n";
import * as ResultsConfig from "../Results/ResultsConfig";
import * as Constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import { env, makeContainer as container, borderedRoundRect } from "@Env";

const ROW_SPACING = 55;
const LABEL_X_OFFSET = -290;
const VALUE_X_OFFSET = 290;

export function createRunStatsPanel(
	runStats = env.state.session.runStats
): Phaser.GameObjects.Container {
	if (!runStats) {
		throw new Error("RunStatsPanel: runStats is undefined");
	}

	const panelWidth = ResultsConfig.RUN_COMPLETE_PANEL.width;
	const panelHeight = ResultsConfig.RUN_COMPLETE_PANEL.height;
	const panelX = ResultsConfig.LEFT_PANEL_X;
	const panelY = Constants.MIDDLE_SCREEN_Y;

	const titleY = panelY - 265;
	const dividerY = titleY + 43;
	const firstRowY = dividerY + 62;
	const seedDividerY = panelY + 228;
	const seedY = panelY + 260;

	// One stat row: label left-aligned to a fixed column, value right-aligned to a fixed column.
	const row = (label: string, value: string | number, y: number): Phaser.GameObjects.Text[] => {
		const labelText = env.scene.add
			.text(panelX + LABEL_X_OFFSET, y, label, Constants.defaultTextConfig)
			.setOrigin(0, 0.5);
		const valueText = env.scene.add
			.text(panelX + VALUE_X_OFFSET, y, value.toString(), Constants.defaultTextConfig)
			.setOrigin(1, 0.5);
		return [labelText, valueText];
	};

	const divider = (y: number): Phaser.GameObjects.Rectangle =>
		env.scene.add.rectangle(panelX, y, panelWidth - 200, 2, 0xffffff, 0.15);

	// Initial game seed, shown below the stats
	const seedText = env.scene.add
		.text(
			0,
			0,
			`${i18n.t("run_stats.seed")}: ${env.state.session.initial_seed || env.state.session.seed}`,
			{
				...Constants.defaultTextConfig,
				fontSize: "16px",
				color: "#cccccc",
			}
		)
		.setOrigin(0.5)
		.setPosition(panelX, seedY);

	// Small "copy seed" button under the seed value so players can share a run.
	const copySeedButton = UIButton.create({
		text: i18n.t("run_stats.copy_seed"),
		position: [panelX, seedY + 48],
		callback: async () => {
			const seed = env.state.session.initial_seed || env.state.session.seed;
			try {
				await navigator.clipboard.writeText(seed);
			} catch {
				// Fallback for environments without the async clipboard API.
				const textarea = document.createElement("textarea");
				textarea.value = seed;
				document.body.appendChild(textarea);
				textarea.select();
				document.execCommand("copy");
				document.body.removeChild(textarea);
			}
			// Flip the label so the player knows the seed landed on the clipboard.
			copySeedButton.text.setText(i18n.t("run_stats.copied"));
		},
		width: 200,
	});

	return container([
		borderedRoundRect(
			env.scene,
			[panelX, panelY],
			[panelWidth, panelHeight],
			ResultsConfig.RESULTS_PANEL.borderRadius,
			ResultsConfig.RESULTS_PANEL.backgroundColor,
			ResultsConfig.RESULTS_PANEL.backgroundAlpha
		),
		env.scene.add
			.text(0, 0, i18n.t("run_stats.title"), Constants.titleTextConfig)
			.setOrigin(0.5)
			.setPosition(panelX, titleY),
		divider(dividerY),
		...row(i18n.t("run_stats.damage_dealt"), runStats.damageDealt.toFixed(0), firstRowY),
		...row(
			i18n.t("run_stats.poison_dealt"),
			runStats.poisonDealt.toFixed(0),
			firstRowY + ROW_SPACING
		),
		...row(
			i18n.t("run_stats.shield_dealt"),
			runStats.shieldDealt.toFixed(0),
			firstRowY + ROW_SPACING * 2
		),
		...row(
			i18n.t("run_stats.regen_dealt"),
			runStats.regenDealt.toFixed(0),
			firstRowY + ROW_SPACING * 3
		),
		...row(
			i18n.t("run_stats.heal_dealt"),
			runStats.healDealt.toFixed(0),
			firstRowY + ROW_SPACING * 4
		),
		...row(
			i18n.t("run_stats.most_powerful_unit"),
			runStats.mostPowerfulUnit
				? `${i18n.getName(runStats.mostPowerfulUnit.cardId)} (${runStats.mostPowerfulUnit.power})`
				: "-",
			firstRowY + ROW_SPACING * 5
		),
		...row(
			i18n.t("run_stats.total_units_recruited"),
			runStats.totalUnitsRecruited,
			firstRowY + ROW_SPACING * 6
		),
		divider(seedDividerY),
		seedText,
		copySeedButton.container,
	]);
}
