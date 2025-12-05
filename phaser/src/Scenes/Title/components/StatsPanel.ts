/**
 * StatsPanel - Displays player lifetime statistics
 */
import * as c from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { getCurrentScene } from "@Models/State";
import * as io from "@PhaserIO";
import { createUIButton } from "@Components/UIButton";
import { getStats, getMostUsedUnit } from "@Models/StatsStore";

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
	const title = io.Title1("Statistics");
	io.SetPosition(title, vec2(c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y - PANEL_HEIGHT / 2 + 50));
	io.Centralize(title);

	// Stats display data
	const statsData = [
		{ label: "Total Runs Played", value: stats.totalRuns.toString() },
		{ label: "Gold Victories", value: stats.goldVictories.toString(), color: "#FFD700" },
		{ label: "Silver Victories", value: stats.silverVictories.toString(), color: "#C0C0C0" },
		{ label: "Bronze Victories", value: stats.bronzeVictories.toString(), color: "#CD7F32" },
		{ label: "Furthest Infinite Mode", value: stats.furthestInfiniteRound > 0 ? `${stats.furthestInfiniteRound} wins` : "-" },
		{ label: "Most Used Unit", value: mostUsedName },
		{ label: "Most Powerful Unit", value: mostPowerfulValue, color: "#ff6b6b" },
	];

	const startY = c.MIDDLE_SCREEN_Y - 200;
	const rowSpacing = 50;
	const labelX = c.MIDDLE_SCREEN_X - 160;
	const valueX = c.MIDDLE_SCREEN_X + 100;

	const statTexts: Phaser.GameObjects.Text[] = [];

	statsData.forEach((stat, index) => {
		const y = startY + index * rowSpacing;

		const labelText = scene.add.text(labelX, y, stat.label, {
			fontFamily: "Arial",
			fontSize: "24px",
			color: "#ecf0f1",
		});
		labelText.setOrigin(0, 0.5);
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
		"CLOSE",
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
