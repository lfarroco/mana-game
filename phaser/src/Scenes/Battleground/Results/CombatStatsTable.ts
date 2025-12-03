import * as io from "@PhaserIO";
import { size, vec2 } from "@Models/Geometry";
import * as CombatStatsTracker from "../Systems/CombatStatsTracker";
import { Unit } from "@Models/Entities/Unit";
import { RESULTS_PANEL } from "./ResultsConfig";
import * as c from "@Constants/constants";
import { getCurrentScene } from "@Models/State";
import { loadUnitAssets } from "../Systems/Loader";
import * as CharaTooltip from "@Systems/Chara/CharaTooltip";

const PANEL_CONFIG = {
	width: 600,
	baseHeight: 200, // Base height for title, headers, and padding
	padding: 20,
	headerColor: "#FFD700",
	playerColor: "#4A9EFF",
	cpuColor: "#FF6B6B",
	fontSize: 16,
	headerFontSize: 18,
	titleFontSize: 24,
	rowHeight: 70,
	columnWidths: [150, 80, 80, 80, 80, 80],
};

async function createStatsPanel(
	units: Unit[],
	position: Vec2,
	title: string,
	titleColor: string,
	forceFilter: (unit: Unit) => boolean
): Promise<Phaser.GameObjects.Container> {
	const elements: Phaser.GameObjects.GameObject[] = [];
	const { padding } = PANEL_CONFIG;

	// Filter units for this panel
	const filteredUnits = units.filter(forceFilter);

	// Calculate dynamic height based on number of units
	const panelHeight = PANEL_CONFIG.baseHeight + (filteredUnits.length * PANEL_CONFIG.rowHeight) + 40;

	// Panel background
	const background = io.BorderedRoundRect(
		position,
		size(PANEL_CONFIG.width, panelHeight),
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
	io.SetPosition(titleText, vec2(position.x, position.y - panelHeight / 2 + 30));
	io.Centralize(titleText);
	elements.push(titleText);

	// Headers
	const headers = ["DMG", "Heal", "Shield", "Poison", "Regen"];
	let startX = position.x - PANEL_CONFIG.width / 2 + padding + PANEL_CONFIG.columnWidths[0]; // Start after sprite column
	let startY = position.y - panelHeight / 2 + 70;

	headers.forEach((header, index) => {
		const headerText = io.Text(header, {
			fontSize: PANEL_CONFIG.headerFontSize,
			color: PANEL_CONFIG.headerColor,
			fontStyle: "bold",
		});
		io.SetPosition(headerText, vec2(startX, startY));
		elements.push(headerText);
		startX += PANEL_CONFIG.columnWidths[index + 1];
	});

	// Data rows - use for loop to handle async properly
	let currentY = startY + PANEL_CONFIG.rowHeight;
	for (const unit of filteredUnits) {
		const stats = CombatStatsTracker.getUnitStats(unit.id);
		if (!stats) continue;

		const totalDamage = Math.floor(stats.damageDealt + stats.poisonApplied);
		const totalHeal = Math.floor(stats.healingDone + stats.regenApplied);
		const shield = Math.floor(stats.shieldGranted);
		const poison = Math.floor(stats.poisonApplied);
		const regen = Math.floor(stats.regenApplied);

		// Create sprite for this unit
		await loadUnitAssets([unit]);
		const sprite = getCurrentScene().add.sprite(
			position.x - PANEL_CONFIG.width / 2 + padding + 25,
			currentY,
			unit.pic
		);

		// Configure sprite
		const frameNames = getCurrentScene().textures.get(unit.pic).getFrameNames();
		const idleFrames = frameNames.filter((name) => name.startsWith(unit.pic + "_idle_"));
		idleFrames.sort((a, b) => {
			const numA = parseInt(a.match(/_(\d+)\.png$/)?.[1] || "0", 10);
			const numB = parseInt(b.match(/_(\d+)\.png$/)?.[1] || "0", 10);
			return numA - numB;
		});
		const firstIdle = idleFrames[0] || frameNames[0];
		sprite.setTexture(unit.pic, firstIdle);
		sprite.setDisplaySize(60, 60);

		// Flip CPU units
		if (unit.force === c.FORCE_ID_CPU) {
			sprite.setFlipX(true);
		}

		// Play idle animation if it exists
		if (getCurrentScene().anims.exists(unit.pic + "_idle")) {
			sprite.play(unit.pic + "_idle");
		}

		// Enable tooltips
		sprite.setInteractive();

		sprite.on('pointerover', () => {
			import('@Components/Tooltip').then(({ renderTooltip }) => {
				// Build description using the same functions as board units
				const title = unit.name;

				const effectBlocks = unit.effects
					.map((e) => CharaTooltip.buildEffectBlock(e, unit.power))
					.filter((e): e is string => e !== null);
				const reactionBlocks = unit.reactions.map((r) => CharaTooltip.getReactionDescription(r, unit.power));

				const cdAsSeconds = (unit.cooldown / 1000).toFixed(1);
				const cdBlock = [`[color=#c0c0c0]Cooldown:[/color] [color=#ffa94d]${cdAsSeconds}s[/color]`];

				const critBlock = (unit.critical || 0) > 0
					? [`[color=#c0c0c0]Crit:[/color] [color=#ffa94d]${unit.critical}%[/color]`]
					: [];

				const statsBlock = [...cdBlock, ...critBlock].join(" | ");
				const descriptionString = [...effectBlocks, ...reactionBlocks].join("\n") || "No special abilities";
				const description = [statsBlock, descriptionString].join("\n");

				// Position tooltip
				const screenWidth = getCurrentScene().sys.game.config.width as number;
				const isRightSide = sprite.x > screenWidth / 2;
				const TOOLTIP_OFFSET_X = 300;
				const tooltipX = isRightSide ? sprite.x - TOOLTIP_OFFSET_X : sprite.x + TOOLTIP_OFFSET_X;
				const tooltipY = sprite.y - 30;

				renderTooltip(tooltipX, tooltipY, title, description);
			});
		});
		sprite.on('pointerout', () => {
			CharaTooltip.onCharaPointerOut();
		});

		elements.push(sprite);

		const rowData = [
			totalDamage > 0 ? totalDamage.toString() : "-",
			totalHeal > 0 ? totalHeal.toString() : "-",
			shield > 0 ? shield.toString() : "-",
			poison > 0 ? poison.toString() : "-",
			regen > 0 ? regen.toString() : "-",
		];

		let currentX = position.x - PANEL_CONFIG.width / 2 + padding + PANEL_CONFIG.columnWidths[0];
		rowData.forEach((data, index) => {
			const cellText = io.Text(data, {
				fontSize: PANEL_CONFIG.fontSize,
				color: "#FFFFFF",
			});
			io.SetPosition(cellText, vec2(currentX, currentY));
			elements.push(cellText);
			currentX += PANEL_CONFIG.columnWidths[index + 1];
		});

		currentY += PANEL_CONFIG.rowHeight;
	}

	return io.Container(elements);
}

export async function createCombatStatsPanels(
	units: Unit[],
	centerPanelX: number,
	panelY: number
): Promise<{ playerPanel: Phaser.GameObjects.Container; cpuPanel: Phaser.GameObjects.Container }> {
	const panelSpacing = 600; // Distance from center to side panels

	// Use the actual force ID constants
	const playerForceId = c.FORCE_ID_PLAYER;
	const cpuForceId = c.FORCE_ID_CPU;

	// Player panel on the left
	const playerPanel = await createStatsPanel(
		units,
		vec2(centerPanelX - panelSpacing, panelY),
		"Player Team",
		PANEL_CONFIG.playerColor,
		(unit) => unit.force === playerForceId
	);

	// CPU panel on the right
	const cpuPanel = await createStatsPanel(
		units,
		vec2(centerPanelX + panelSpacing, panelY),
		"Enemy Team",
		PANEL_CONFIG.cpuColor,
		(unit) => unit.force === cpuForceId
	);

	return { playerPanel, cpuPanel };
}
