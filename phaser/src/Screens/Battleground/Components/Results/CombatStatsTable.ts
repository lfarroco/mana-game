import * as CombatStatsTracker from "@game/Combat/CombatStatsTracker";
import { Unit } from "@game/Models";
import * as Constants from "@game/Constants";
import * as ResultsConfig from "./ResultsConfig";
import * as CharaTooltip from "@Systems/Chara/CharaTooltip";
import * as Panel from "@Components/Panel/Panel";
import * as i18n from "@i18n/i18n";
import * as Utils from "@utils";
import { getLastCombatTrackerState } from "@Screens/Battleground/Phases/Combat/handleCombatPhase";
import { env } from "../../../../Env";

const PANEL_CONFIG = {
	width: 600,
	baseHeight: 100, // Base height for title, headers, and padding
	padding: 20,
	headerColor: "#FFD700",
	playerColor: "#4A9EFF",
	cpuColor: "#FF6B6B",
	fontSize: 16,
	headerFontSize: 18,
	titleFontSize: 24,
	rowHeight: 100,
	columnWidths: [150, 80, 80, 80, 80, 80],
};

async function createStatsPanel(
	units: Unit[],
	position: Vec2,
	title: string,
	titleColor: string,
	forceFilter: (unit: Unit) => boolean
): Promise<Phaser.GameObjects.Container> {
	const { padding } = PANEL_CONFIG;

	const filteredUnits = units.filter(forceFilter);

	const panelHeight = PANEL_CONFIG.baseHeight + filteredUnits.length * PANEL_CONFIG.rowHeight + 40;

	const panel = Panel.createPanel(position, {
		width: PANEL_CONFIG.width,
		height: panelHeight,
		borderRadius: ResultsConfig.RESULTS_PANEL.borderRadius,
		backgroundColor: ResultsConfig.RESULTS_PANEL.backgroundColor,
		backgroundAlpha: ResultsConfig.RESULTS_PANEL.backgroundAlpha,
	});

	const titleText = io.Text(title, {
		fontSize: PANEL_CONFIG.titleFontSize,
		color: titleColor,
		fontStyle: "bold",
	});
	const [px, py] = position;
	io.SetPosition(titleText, [px, py - panelHeight / 2 + 30]);
	io.Centralize(titleText);
	panel.add(titleText);

	const headers = [
		i18n.t("combatStats.headers.dmg"),
		i18n.t("combatStats.headers.heal"),
		i18n.t("combatStats.headers.shield"),
		i18n.t("combatStats.headers.poison"),
		i18n.t("combatStats.headers.regen"),
	];
	let startX = px - PANEL_CONFIG.width / 2 + padding + PANEL_CONFIG.columnWidths[0]; // Start after sprite column
	const startY = py - panelHeight / 2 + 70;

	headers.forEach((header, index) => {
		const headerText = io.Text(header, {
			fontSize: PANEL_CONFIG.headerFontSize,
			color: PANEL_CONFIG.headerColor,
			fontStyle: "bold",
		});
		io.SetPosition(headerText, [startX, startY]);
		panel.add(headerText);
		startX += PANEL_CONFIG.columnWidths[index + 1];
	});

	let currentY = startY + PANEL_CONFIG.rowHeight;
	for (const unit of filteredUnits) {
		const trackerState = getLastCombatTrackerState();
		if (!trackerState) continue;
		const stats = CombatStatsTracker.getUnitStats(trackerState, unit.id);
		if (!stats) continue;

		const totalDamage = Math.floor(stats.damageDealt);
		const totalHeal = Math.floor(stats.healingDone);
		const shield = Math.floor(stats.shieldGranted);
		const poison = Math.floor(stats.poisonApplied);
		const regen = Math.floor(stats.regenApplied);

		const sprite = env.scene.add.sprite(
			px - PANEL_CONFIG.width / 2 + padding + 25,
			currentY,
			unit.pic
		);

		const frameNames = env.scene.textures.get(unit.pic).getFrameNames();
		const idleFrames = frameNames.filter((name) => name.startsWith(unit.pic + "_idle_"));
		idleFrames.sort((a, b) => {
			const numA = parseInt(a.match(/_(\d+)\.png$/)?.[1] || "0", 10);
			const numB = parseInt(b.match(/_(\d+)\.png$/)?.[1] || "0", 10);
			return numA - numB;
		});
		const firstIdle = idleFrames[0] || frameNames[0];
		sprite.setTexture(unit.pic, firstIdle);
		sprite.setDisplaySize(90, 90);

		if (unit.force === Constants.FORCE_ID_CPU) {
			sprite.setFlipX(true);
		}

		if (env.scene.anims.exists(unit.pic + "_idle")) {
			sprite.play(unit.pic + "_idle");
		}

		sprite.setInteractive();

		sprite.on("pointerover", () => {
			import("@Components/Tooltip/Tooltip").then(({ renderTooltip }) => {
				const title = i18n.getName(unit.cardId);

				const effectBlocks = unit.effects
					.map((e) => CharaTooltip.buildEffectBlock(e, unit.power))
					.filter((e): e is string => e !== null);
				const reactionBlocks = unit.reactions.map((r) =>
					CharaTooltip.getReactionDescription(r, unit.power)
				);

				const cdAsSeconds = (unit.cooldown / 1000).toFixed(1);
				const cdBlock = [
					`[color=#c0c0c0]${i18n.t("combatStats.tooltip.cooldown")}[/color] [color=#ffa94d]${cdAsSeconds}s[/color]`,
				];

				const critBlock =
					(unit.critical || 0) > 0
						? [
							`[color=#c0c0c0]${i18n.t("combatStats.tooltip.crit")}[/color] [color=#ffa94d]${unit.critical}%[/color]`,
						]
						: [];

				const statsBlock = [...cdBlock, ...critBlock].join(" | ");
				const descriptionString =
					[...effectBlocks, ...reactionBlocks].join("\n") || i18n.t("combatStats.tooltip.noAbilities");
				const description = [statsBlock, descriptionString].join("\n");

				const screenWidth = env.scene.sys.game.config.width as number;
				const isRightSide = sprite.x > screenWidth / 2;
				const TOOLTIP_OFFSET_X = 300;
				const tooltipX = isRightSide ? sprite.x - TOOLTIP_OFFSET_X : sprite.x + TOOLTIP_OFFSET_X;
				const tooltipY = sprite.y - 30;

				renderTooltip(tooltipX, tooltipY, title, description);
			});
		});
		sprite.on("pointerout", () => {
			CharaTooltip.onCharaPointerOut();
		});

		panel.add(sprite);

		const rowData = [
			totalDamage > 0 ? Utils.compactNumber(totalDamage) : "-",
			totalHeal > 0 ? Utils.compactNumber(totalHeal) : "-",
			shield > 0 ? Utils.compactNumber(shield) : "-",
			poison > 0 ? Utils.compactNumber(poison) : "-",
			regen > 0 ? Utils.compactNumber(regen) : "-",
		];

		let currentX = px - PANEL_CONFIG.width / 2 + padding + PANEL_CONFIG.columnWidths[0];
		rowData.forEach((data, index) => {
			const cellText = io.Text(data, {
				fontSize: PANEL_CONFIG.fontSize,
				color: "#FFFFFF",
			});
			io.SetPosition(cellText, [currentX, currentY]);
			panel.add(cellText);
			currentX += PANEL_CONFIG.columnWidths[index + 1];
		});

		currentY += PANEL_CONFIG.rowHeight;
	}

	return panel.container;
}

export async function createCombatStatsPanels(
	units: Unit[],
	centerPanelX: number,
	panelY: number
): Promise<{ playerPanel: Phaser.GameObjects.Container; cpuPanel: Phaser.GameObjects.Container }> {
	const panelSpacing = 600;

	const playerForceId = Constants.FORCE_ID_PLAYER;
	const cpuForceId = Constants.FORCE_ID_CPU;

	const playerPanel = await createStatsPanel(
		units,
		[centerPanelX - panelSpacing, panelY],
		i18n.t("combatStats.playerTeam"),
		PANEL_CONFIG.playerColor,
		(unit) => unit.force === playerForceId
	);

	const cpuPanel = await createStatsPanel(
		units,
		[centerPanelX + panelSpacing, panelY],
		i18n.t("combatStats.enemyTeam"),
		PANEL_CONFIG.cpuColor,
		(unit) => unit.force === cpuForceId
	);

	return { playerPanel, cpuPanel };
}
