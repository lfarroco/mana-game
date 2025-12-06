/**
 * StatsPanel - Displays player lifetime statistics
 */
import * as c from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { getCurrentScene } from "@Models/State";
import * as io from "@PhaserIO";
import { createUIButton } from "@Components/UIButton";
import { getStats, getMostUsedUnit } from "@Models/StatsStore";
import { t } from "@i18n/i18n";

const OVERLAY_ALPHA = 0.85;
const PANEL_WIDTH = 900;
const PANEL_HEIGHT = 600;

let isOpen = false;

/**
 * Opens the stats panel overlay
 */
export function openStats(): void {
	if (isOpen) return;
	isOpen = true;

	const scene = getCurrentScene();
	const stats = getStats();

	// Get unit display names (now stored directly)
	const mostUsedName = getMostUsedUnit() || "-";
	const mostPowerfulValue = stats.mostPowerfulUnit
		? `${stats.mostPowerfulUnit.name} (${stats.mostPowerfulUnit.power})`
		: "-";

	// Create dark overlay background
	const overlay = scene.add.rectangle(
		c.MIDDLE_SCREEN_X,
		c.MIDDLE_SCREEN_Y,
		c.SCREEN_WIDTH,
		c.SCREEN_HEIGHT,
		0x000000,
		OVERLAY_ALPHA
	);
	overlay.setInteractive(); // Block clicks to elements behind

	// Create panel background
	const panelBg = io.BorderedRoundRect(
		vec2(c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y),
		{ width: PANEL_WIDTH, height: PANEL_HEIGHT },
		20,
		0x2c3e50,
		0.95
	);

	// Create title
	const title = io.Title1(t("stats.title"));
	io.SetPosition(title, vec2(c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y - PANEL_HEIGHT / 2 + 50));
	io.Centralize(title);

	// Stats display data
	const statsData = [
		{ label: t("stats.totalRuns"), value: stats.totalRuns.toString() },
		{ label: t("stats.goldVictories"), value: stats.goldVictories.toString(), color: "#FFD700" },
		{ label: t("stats.silverVictories"), value: stats.silverVictories.toString(), color: "#C0C0C0" },
		{ label: t("stats.bronzeVictories"), value: stats.bronzeVictories.toString(), color: "#CD7F32" },
		{ label: t("stats.furthestInfinite"), value: stats.furthestInfiniteRound > 0 ? t("stats.wins", { count: stats.furthestInfiniteRound.toString() }) : "-" },
		{ label: t("stats.mostUsed"), value: mostUsedName },
		{ label: t("stats.mostPowerful"), value: mostPowerfulValue, color: "#ff6b6b" },
	];

	const startY = c.MIDDLE_SCREEN_Y - 200;
	const rowSpacing = 50;
	const labelX = c.MIDDLE_SCREEN_X - 20;
	const valueX = c.MIDDLE_SCREEN_X + 20;

	const statTexts: Phaser.GameObjects.Text[] = [];

	statsData.forEach((stat, index) => {
		const y = startY + index * rowSpacing;

		const labelText = scene.add.text(labelX, y, stat.label, {
			fontFamily: "Arial",
			fontSize: "24px",
			color: "#ecf0f1",
			align: "right"
		});
		labelText.setOrigin(1, 0.5);
		statTexts.push(labelText);

		const valueText = scene.add.text(valueX, y, stat.value, {
			fontFamily: "Arial",
			fontSize: "28px",
			color: stat.color || "#ffffff",
			fontStyle: "bold",
			align: "left"
		});
		valueText.setOrigin(0, 0.5);
		statTexts.push(valueText);
	});

	// Create close button
	const closeButton = createUIButton(
		t("stats.close"),
		vec2(c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y + PANEL_HEIGHT / 2 - 60),
		() => {
			container.destroy(true);
			isOpen = false;
		}
	);

	// Create container for all elements
	const container = io.Container([
		overlay,
		panelBg,
		title,
		...statTexts,
		closeButton.container,
	]);

	io.BringToTop(container);
}
