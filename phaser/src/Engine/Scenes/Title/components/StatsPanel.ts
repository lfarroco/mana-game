import { compactNumber } from "@utils";
import * as c from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { getCurrentScene } from "@Models/State";
import * as io from "@PhaserIO";
import { createUIButton } from "@Components/UIButton";
import { getStats, getMostUsedUnit } from "@Models/StatsStore";
import { t } from "@i18n/i18n";

const OVERLAY_ALPHA = 0.85;
const PANEL_WIDTH = 1100;
const PANEL_HEIGHT = 600;

let isOpen = false;

export function openStats(): void {
	if (isOpen) return;
	isOpen = true;

	const scene = getCurrentScene();
	const stats = getStats();

	const mostUsedName = getMostUsedUnit() || "-";
	const mostPowerfulValue = stats.mostPowerfulUnit
		? `${stats.mostPowerfulUnit.name} (${stats.mostPowerfulUnit.power})`
		: "-";

	const overlay = scene.add.rectangle(
		c.MIDDLE_SCREEN_X,
		c.MIDDLE_SCREEN_Y,
		c.SCREEN_WIDTH,
		c.SCREEN_HEIGHT,
		0x000000,
		OVERLAY_ALPHA
	);
	overlay.setInteractive();

	const panelBg = io.BorderedRoundRect(
		vec2(c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y),
		{ width: PANEL_WIDTH, height: PANEL_HEIGHT },
		20,
		0x2c3e50,
		0.95
	);

	const title = io.Title1(t("stats.title"));
	io.SetPosition(title, vec2(c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y - PANEL_HEIGHT / 2 + 50));
	io.Centralize(title);

	// --- Left Column: Battle Totals ---
	const leftTitle = io.Title2(t("stats.battleTotals"));
	io.SetPosition(leftTitle, vec2(c.MIDDLE_SCREEN_X - PANEL_WIDTH / 4, c.MIDDLE_SCREEN_Y - PANEL_HEIGHT / 2 + 100));
	io.Centralize(leftTitle);

	type StatItem = { label: string; value: string; color?: string };

	const leftStatsData: StatItem[] = [
		{ label: t("stats.totalDamage"), value: compactNumber(stats.totalDamage) },
		{ label: t("stats.totalHealed"), value: compactNumber(stats.totalHealed) },
		{ label: t("stats.totalShield"), value: compactNumber(stats.totalShield) },
		{ label: t("stats.totalPoison"), value: compactNumber(stats.totalPoison) },
		{ label: t("stats.totalRegen"), value: compactNumber(stats.totalRegen) },
	];

	// --- Right Column: Career Stats ---
	const rightTitle = io.Title2(t("stats.careerStats"));
	io.SetPosition(rightTitle, vec2(c.MIDDLE_SCREEN_X + PANEL_WIDTH / 4, c.MIDDLE_SCREEN_Y - PANEL_HEIGHT / 2 + 100));
	io.Centralize(rightTitle);

	const rightStatsData: StatItem[] = [
		{ label: t("stats.totalRuns"), value: stats.totalRuns.toString() },
		{ label: t("stats.goldVictories"), value: stats.goldVictories.toString(), color: "#FFD700" },
		{ label: t("stats.silverVictories"), value: stats.silverVictories.toString(), color: "#C0C0C0" },
		{ label: t("stats.bronzeVictories"), value: stats.bronzeVictories.toString(), color: "#CD7F32" },
		{ label: t("stats.furthestInfinite"), value: stats.furthestInfiniteRound > 0 ? t("stats.wins", { count: stats.furthestInfiniteRound.toString() }) : "-" },
		{ label: t("stats.mostUsed"), value: mostUsedName },
		{ label: t("stats.mostPowerful"), value: mostPowerfulValue, color: "#ff6b6b" },
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

			const labelText = scene.add.text(labelX, y, stat.label, {
				fontFamily: "Arial",
				fontSize: "22px",
				color: "#ecf0f1",
				align: "right"
			});
			labelText.setOrigin(1, 0.5);
			statTexts.push(labelText);

			const valueText = scene.add.text(valueX, y, stat.value, {
				fontFamily: "Arial",
				fontSize: "24px",
				color: stat.color || "#ffffff",
				fontStyle: "bold",
				align: "left"
			});
			valueText.setOrigin(0, 0.5);
			statTexts.push(valueText);
		});
	};

	renderStats(leftStatsData, c.MIDDLE_SCREEN_X - PANEL_WIDTH / 4);
	renderStats(rightStatsData, c.MIDDLE_SCREEN_X + PANEL_WIDTH / 4);

	const closeButton = createUIButton(
		t("stats.close"),
		vec2(c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y + PANEL_HEIGHT / 2 - 60),
		() => {
			container.destroy(true);
			isOpen = false;
		}
	);

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
