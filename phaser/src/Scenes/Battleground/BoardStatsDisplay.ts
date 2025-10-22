import Phaser from 'phaser';
import * as c from '../../constants/constants';
import { cpuForce, playerForce } from '@Models/Entities/Force';
import { scene } from './BattlegroundScene';
import { getTotalRegenHealing } from './Systems/RegenSystem';
import { getTotalPoisonDamage } from './Systems/PoisonDamageSystem';

const FONT_SIZE = 28;
const FONT_FAMILY = "'Arial Black', sans-serif";
const STROKE_COLOR = 'white';
const STROKE_SIZE = 4;

const MORALE_COLOR = 'green';
const SHIELD_COLOR = 'yellow';
const REGEN_COLOR = '#006400';
const POISON_COLOR = 'purple';

const STATS_X_OFFSET = 50;
const STATS_Y_OFFSET = 120;
const BOARD_HEIGHT_MULTIPLIER = 3;
const BOARD_HEIGHT_PADDING = 8 * 2;

const BG_WIDTH = 800;
const BG_HEIGHT = 80;
const BG_COLOR = 0x000000;
const BG_ALPHA = 0.4;
const BG_X = -100;
const BG_Y = -35;

const MORALE_TEXT_X = 0;
const SHIELD_TEXT_X = 200;
const REGEN_TEXT_X = 400;
const POISON_TEXT_X = 600;
const TEXT_Y = 0;
const TEXT_ORIGIN = 0.5;

type BoardStatsDisplay = {
	container: Phaser.GameObjects.Container;
	moraleText: Phaser.GameObjects.Text;
	shieldText: Phaser.GameObjects.Text;
	regenText: Phaser.GameObjects.Text;
	poisonText: Phaser.GameObjects.Text;
};

let playerBoardStats: BoardStatsDisplay | null = null;
let cpuBoardStats: BoardStatsDisplay | null = null;

function createBoardStatsDisplay(forceId: string): BoardStatsDisplay {
	const isPlayer = forceId === c.FORCE_ID_PLAYER;
	const boardX = isPlayer ? c.PLAYER_BOARD_X : c.CPU_BOARD_X;
	const boardY = isPlayer ? c.PLAYER_BOARD_Y : c.CPU_BOARD_Y;
	const boardHeight = c.TILE_HEIGHT * BOARD_HEIGHT_MULTIPLIER + BOARD_HEIGHT_PADDING;

	const statsX = boardX + STATS_X_OFFSET;
	const statsY = boardY + boardHeight + STATS_Y_OFFSET;

	const container = scene.add.container(statsX, statsY);

	const background = scene.add.rectangle(BG_X, BG_Y, BG_WIDTH, BG_HEIGHT, BG_COLOR, BG_ALPHA);
	background.setOrigin(0);

	const moraleText = scene.add.text(MORALE_TEXT_X, TEXT_Y, '0')
		.setFontSize(FONT_SIZE)
		.setFontFamily(FONT_FAMILY)
		.setStroke(STROKE_COLOR, STROKE_SIZE)
		.setAlign("center")
		.setColor(MORALE_COLOR);
	const shieldText = scene.add.text(SHIELD_TEXT_X, TEXT_Y, '0')
		.setFontSize(FONT_SIZE)
		.setFontFamily(FONT_FAMILY)
		.setStroke(STROKE_COLOR, STROKE_SIZE)
		.setAlign("center")
		.setColor(SHIELD_COLOR);
	const regenText = scene.add.text(REGEN_TEXT_X, TEXT_Y, '0')
		.setFontSize(FONT_SIZE)
		.setFontFamily(FONT_FAMILY)
		.setStroke(STROKE_COLOR, STROKE_SIZE)
		.setAlign("center")
		.setColor(REGEN_COLOR);
	const poisonText = scene.add.text(POISON_TEXT_X, TEXT_Y, '0')
		.setFontSize(FONT_SIZE)
		.setFontFamily(FONT_FAMILY)
		.setStroke(STROKE_COLOR, STROKE_SIZE)
		.setAlign("center")
		.setColor(POISON_COLOR);

	moraleText.setOrigin(TEXT_ORIGIN);
	shieldText.setOrigin(TEXT_ORIGIN);
	regenText.setOrigin(TEXT_ORIGIN);
	poisonText.setOrigin(TEXT_ORIGIN);

	container.add([background, moraleText, shieldText, regenText, poisonText]);

	return {
		container,
		moraleText,
		shieldText,
		regenText,
		poisonText
	};
}

export function init(): void {
	destroy();

	playerBoardStats = createBoardStatsDisplay(c.FORCE_ID_PLAYER);
	cpuBoardStats = createBoardStatsDisplay(c.FORCE_ID_CPU);

	updateStats(c.FORCE_ID_PLAYER);
	updateStats(c.FORCE_ID_CPU);
}

export function updateStats(forceId: string): void {
	const display = forceId === c.FORCE_ID_PLAYER ? playerBoardStats : cpuBoardStats;
	if (!display) return;

	const force = forceId === c.FORCE_ID_PLAYER ? playerForce : cpuForce;

	display.moraleText.setText(`${Math.round(force.morale)}`);
	display.shieldText.setText(`${Math.round(force.shield)}`);
	display.regenText.setText(`${Math.round(getTotalRegenHealing(forceId))}`);
	display.poisonText.setText(`${Math.round(getTotalPoisonDamage(forceId))}`);
}

export function showCpuStats(): void {
	if (cpuBoardStats) {
		cpuBoardStats.container.setVisible(true);
	}
}

export function hideCpuStats(): void {
	if (cpuBoardStats) {
		cpuBoardStats.container.setVisible(false);
	}
}

export function destroy(): void {
	if (playerBoardStats) {
		playerBoardStats.container.destroy();
		playerBoardStats = null;
	}
	if (cpuBoardStats) {
		cpuBoardStats.container.destroy();
		cpuBoardStats = null;
	}
}
