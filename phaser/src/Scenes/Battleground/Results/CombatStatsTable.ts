import * as io from "@PhaserIO";
import { size, vec2 } from "@Models/Geometry";
import * as CombatStatsTracker from "../Systems/CombatStatsTracker";
import { Unit } from "@Models/Entities/Unit";
import { RESULTS_PANEL } from "./ResultsConfig";

const PANEL_CONFIG = {
	width: 420,
	height: 600,
	padding: 20,
	headerColor: "#FFD700",
	playerColor: "#4A9EFF",
	cpuColor: "#FF6B6B",
	fontSize: 16,
	headerFontSize: 18,
	titleFontSize: 24,
	rowHeight: 28,
	columnWidths: [100, 60, 60, 60, 60, 60],
};

function createStatsPanel(
	units: Unit[],
	position: Vec2,
	title: string,
	titleColor: string,
	forceFilter: (unit: Unit) => boolean
): Phaser.GameObjects.Container {
	const elements: Phaser.GameObjects.GameObject[] = [];
	const { padding } = PANEL_CONFIG;

	// Filter units for this panel
	const filteredUnits = units.filter(forceFilter);

	// Panel background
	const background = io.BorderedRoundRect(
		position,
		size(PANEL_CONFIG.width, PANEL_CONFIG.height),
		RESULTS_PANEL.borderRadius,
		RESULTS_PANEL.backgroundColor,
		RESULTS_PANEL.backgroundAlpha
	);
	elements.push(background);

	// Title
	const titleText = io.Text(title, {
		fontSize: PANEL_CONFIG.titleFontSize,
		color: titleColor,
		fontStyle: "bold",
	});
	io.SetPosition(titleText, vec2(position.x, position.y - PANEL_CONFIG.height / 2 + 30));
	io.Centralize(titleText);
	elements.push(titleText);

	// Headers
	const headers = ["Unit", "DMG", "Heal", "Shield", "Poison", "Regen"];
	let startX = position.x - PANEL_CONFIG.width / 2 + padding;
	let startY = position.y - PANEL_CONFIG.height / 2 + 70;

	headers.forEach((header, index) => {
		const headerText = io.Text(header, {
			fontSize: PANEL_CONFIG.headerFontSize,
			color: PANEL_CONFIG.headerColor,
			fontStyle: "bold",
		});
		io.SetPosition(headerText, vec2(startX, startY));
		elements.push(headerText);
		startX += PANEL_CONFIG.columnWidths[index];
	});

	// Data rows
	let currentY = startY + PANEL_CONFIG.rowHeight;

	filteredUnits.forEach((unit) => {
		const stats = CombatStatsTracker.getUnitStats(unit.id);
		if (!stats) return;

		const totalDamage = Math.floor(stats.damageDealt + stats.poisonApplied);
		const totalHeal = Math.floor(stats.healingDone + stats.regenApplied);
		const shield = Math.floor(stats.shieldGranted);
		const poison = Math.floor(stats.poisonApplied);
		const regen = Math.floor(stats.regenApplied);

		const rowData = [
			unit.name || "???",
			totalDamage > 0 ? totalDamage.toString() : "-",
			totalHeal > 0 ? totalHeal.toString() : "-",
			shield > 0 ? shield.toString() : "-",
			poison > 0 ? poison.toString() : "-",
			regen > 0 ? regen.toString() : "-",
		];

		let currentX = position.x - PANEL_CONFIG.width / 2 + padding;
		rowData.forEach((data, index) => {
			const cellText = io.Text(data, {
				fontSize: PANEL_CONFIG.fontSize,
				color: index === 0 ? titleColor : "#FFFFFF",
			});
			io.SetPosition(cellText, vec2(currentX, currentY));
			elements.push(cellText);
			currentX += PANEL_CONFIG.columnWidths[index];
		});

		currentY += PANEL_CONFIG.rowHeight;
	});

	return io.Container(elements);
}

export function createCombatStatsPanels(
	units: Unit[],
	centerPanelX: number,
	panelY: number
): { playerPanel: Phaser.GameObjects.Container; cpuPanel: Phaser.GameObjects.Container } {
	const panelSpacing = 450; // Distance from center to side panels

	// Determine player and CPU force IDs from the units
	const playerForceId = units.find(u => u.isCore)?.force || "PLAYER";
	const cpuForceId = units.find(u => u.isCore && u.force !== playerForceId)?.force || "CPU";

	// Player panel on the left
	const playerPanel = createStatsPanel(
		units,
		vec2(centerPanelX - panelSpacing, panelY),
		"Player Team",
		PANEL_CONFIG.playerColor,
		(unit) => unit.force === playerForceId
	);

	// CPU panel on the right
	const cpuPanel = createStatsPanel(
		units,
		vec2(centerPanelX + panelSpacing, panelY),
		"Enemy Team",
		PANEL_CONFIG.cpuColor,
		(unit) => unit.force === cpuForceId
	);

	return { playerPanel, cpuPanel };
}
