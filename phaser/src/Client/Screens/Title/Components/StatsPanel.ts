import * as Utils from "@utils";
import * as c from "@Constants/constants";
import * as Geometry from "@Models/Geometry";
import * as UIButton from "Client/Components/UIButton";
import * as StatsStore from "@Models/StatsStore";
import * as i18n from "@i18n/i18n";

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

	const overlay = io.scene.add.rectangle(
		c.MIDDLE_SCREEN_X,
		c.MIDDLE_SCREEN_Y,
		c.SCREEN_WIDTH,
		c.SCREEN_HEIGHT,
		0x000000,
		OVERLAY_ALPHA
	);
	overlay.setInteractive();

	const panelBg = io.BorderedRoundRect(
		Geometry.vec2(c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y),
		{ width: PANEL_WIDTH, height: PANEL_HEIGHT },
		20,
		0x2c3e50,
		0.95
	);

	const title = io.Title1(i18n.t("stats.title"));
	io.SetPosition(title, Geometry.vec2(c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y - PANEL_HEIGHT / 2 + 50));
	io.Centralize(title);

	// --- Left Column: Battle Totals ---
	const leftTitle = io.Title2(i18n.t("stats.battleTotals"));
	io.SetPosition(
		leftTitle,
		Geometry.vec2(c.MIDDLE_SCREEN_X - PANEL_WIDTH / 4, c.MIDDLE_SCREEN_Y - PANEL_HEIGHT / 2 + 100)
	);
	io.Centralize(leftTitle);

	type StatItem = { label: string; value: string; color?: string };

	const leftStatsData: StatItem[] = [
		{ label: i18n.t("stats.totalDamage"), value: Utils.compactNumber(stats.totalDamage) },
		{ label: i18n.t("stats.totalHealed"), value: Utils.compactNumber(stats.totalHealed) },
		{ label: i18n.t("stats.totalShield"), value: Utils.compactNumber(stats.totalShield) },
		{ label: i18n.t("stats.totalPoison"), value: Utils.compactNumber(stats.totalPoison) },
		{ label: i18n.t("stats.totalRegen"), value: Utils.compactNumber(stats.totalRegen) },
	];

	// --- Right Column: Career Stats ---
	const rightTitle = io.Title2(i18n.t("stats.careerStats"));
	io.SetPosition(
		rightTitle,
		Geometry.vec2(c.MIDDLE_SCREEN_X + PANEL_WIDTH / 4, c.MIDDLE_SCREEN_Y - PANEL_HEIGHT / 2 + 100)
	);
	io.Centralize(rightTitle);

	const rightStatsData: StatItem[] = [
		{ label: i18n.t("stats.totalRuns"), value: stats.totalRuns.toString() },
		{ label: i18n.t("stats.goldVictories"), value: stats.goldVictories.toString(), color: "#FFD700" },
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

			const labelText = io.scene.add.text(labelX, y, stat.label, {
				fontFamily: "Arial",
				fontSize: "22px",
				color: "#ecf0f1",
				align: "right",
			});
			labelText.setOrigin(1, 0.5);
			statTexts.push(labelText);

			const valueText = io.scene.add.text(valueX, y, stat.value, {
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

	const closeButton = UIButton.createUIButton({
		text: i18n.t("stats.close"),
		position: Geometry.vec2(c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y + PANEL_HEIGHT / 2 - 60),
		callback: () => {
			container.destroy(true);
			isOpen = false;
		},
	});

	const container = io.Container([
		overlay,
		panelBg,
		title,
		leftTitle,
		rightTitle,
		...statTexts,
		closeButton.container,
	]);

	io.BringToTop(container);
}
