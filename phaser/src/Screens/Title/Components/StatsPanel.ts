import * as Utils from "@utils";
import * as c from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as StatsStore from "@Models/StatsStore";
import * as i18n from "@i18n/i18n";
import { env } from "@Env";

const OVERLAY_ALPHA = 0.85;
const PANEL_WIDTH = 1100;
const PANEL_HEIGHT = 600;

let isOpen = false;

export function openStats(): void {
	if (isOpen) return;
	isOpen = true;

	const stats = StatsStore.getStats();

	const mostUsedName = StatsStore.getMostUsedUnit() || "-";
	const mostPowerfulValue = stats.mostPowerfulUnit
		? `${stats.mostPowerfulUnit.name} (${stats.mostPowerfulUnit.power})`
		: "-";

	const overlay = env.scene.add.rectangle(
		c.MIDDLE_SCREEN_X,
		c.MIDDLE_SCREEN_Y,
		c.SCREEN_WIDTH,
		c.SCREEN_HEIGHT,
		0x000000,
		OVERLAY_ALPHA
	);
	overlay.setInteractive();

	const panelBg = env.borderedRoundRect(
		[c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y],
		[PANEL_WIDTH, PANEL_HEIGHT],
		20,
		0x2c3e50,
		0.95
	);

	const title = env.scene.add
		.text(
			c.MIDDLE_SCREEN_X,
			c.MIDDLE_SCREEN_Y - PANEL_HEIGHT / 2 + 50,
			i18n.t("stats.title"),
			c.titleTextConfig
		)
		.setOrigin(0.5);

	// --- Left Column: Battle Totals ---
	const leftTitle = env.scene.add
		.text(
			c.MIDDLE_SCREEN_X - PANEL_WIDTH / 4,
			c.MIDDLE_SCREEN_Y - PANEL_HEIGHT / 2 + 100,
			i18n.t("stats.battleTotals"),
			{ ...c.titleTextConfig, fontSize: "24px" }
		)
		.setOrigin(0.5);

	type StatItem = { label: string; value: string; color?: string };

	const leftStatsData: StatItem[] = [
		{ label: i18n.t("stats.totalDamage"), value: Utils.compactNumber(stats.totalDamage) },
		{ label: i18n.t("stats.totalHealed"), value: Utils.compactNumber(stats.totalHealed) },
		{ label: i18n.t("stats.totalShield"), value: Utils.compactNumber(stats.totalShield) },
		{ label: i18n.t("stats.totalPoison"), value: Utils.compactNumber(stats.totalPoison) },
		{ label: i18n.t("stats.totalRegen"), value: Utils.compactNumber(stats.totalRegen) },
	];

	// --- Right Column: Career Stats ---
	const rightTitle = env.scene.add
		.text(
			c.MIDDLE_SCREEN_X + PANEL_WIDTH / 4,
			c.MIDDLE_SCREEN_Y - PANEL_HEIGHT / 2 + 100,
			i18n.t("stats.careerStats"),
			{ ...c.titleTextConfig, fontSize: "24px" }
		)
		.setOrigin(0.5);

	const rightStatsData: StatItem[] = [
		{ label: i18n.t("stats.totalRuns"), value: stats.totalRuns.toString() },
		{
			label: i18n.t("stats.goldVictories"),
			value: stats.goldVictories.toString(),
			color: "#FFD700",
		},
		{
			label: i18n.t("stats.silverVictories"),
			value: stats.silverVictories.toString(),
			color: "#C0C0C0",
		},
		{
			label: i18n.t("stats.bronzeVictories"),
			value: stats.bronzeVictories.toString(),
			color: "#CD7F32",
		},
		{
			label: i18n.t("stats.furthestInfinite"),
			value:
				stats.furthestInfiniteRound > 0
					? i18n.t("stats.wins", { count: stats.furthestInfiniteRound.toString() })
					: "-",
		},
		{ label: i18n.t("stats.mostUsed"), value: mostUsedName },
		{ label: i18n.t("stats.mostPowerful"), value: mostPowerfulValue, color: "#ff6b6b" },
	];

	const startY = c.MIDDLE_SCREEN_Y - 120;
	const rowSpacing = 45;
	const statTexts: Phaser.GameObjects.Text[] = [];

	// Render Helper
	const renderStats = (data: StatItem[], centerX: number) => {
		const labelX = centerX - 10;
		const valueX = centerX + 10;

		data.forEach((stat, index) => {
			const y = startY + index * rowSpacing;

			const labelText = env.scene.add.text(labelX, y, stat.label, {
				fontFamily: "Arial",
				fontSize: "22px",
				color: "#ecf0f1",
				align: "right",
			});
			labelText.setOrigin(1, 0.5);
			statTexts.push(labelText);

			const valueText = env.scene.add.text(valueX, y, stat.value, {
				fontFamily: "Arial",
				fontSize: "24px",
				color: stat.color || "#ffffff",
				fontStyle: "bold",
				align: "left",
			});
			valueText.setOrigin(0, 0.5);
			statTexts.push(valueText);
		});
	};

	renderStats(leftStatsData, c.MIDDLE_SCREEN_X - PANEL_WIDTH / 4);
	renderStats(rightStatsData, c.MIDDLE_SCREEN_X + PANEL_WIDTH / 4);

	const closeButton = UIButton.create({
		text: i18n.t("stats.close"),
		position: [c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y + PANEL_HEIGHT / 2 - 60],
		callback: () => {
			container.destroy(true);
			isOpen = false;
		},
	});

	const container = env.container([
		overlay,
		panelBg,
		title,
		leftTitle,
		rightTitle,
		...statTexts,
		closeButton.container,
	]);

	env.scene.children.bringToTop(container);
}
