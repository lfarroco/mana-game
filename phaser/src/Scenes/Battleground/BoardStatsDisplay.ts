import Phaser from 'phaser';
import BBCodeText from "phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText";
import * as c from '../../constants/constants';
import { cpuForce, playerForce } from '@Models/Entities/Force';
import { scene } from './BattlegroundScene';
import { getTotalRegenHealing } from './Systems/RegenSystem';
import { getTotalPoisonDamage } from './Systems/PoisonDamageSystem';

type BoardStatsDisplay = {
	container: Phaser.GameObjects.Container;
	moraleText: BBCodeText;
	shieldText: BBCodeText;
	regenText: BBCodeText;
	poisonText: BBCodeText;
};

let playerBoardStats: BoardStatsDisplay | null = null;
let cpuBoardStats: BoardStatsDisplay | null = null;

function createBoardStatsDisplay(forceId: string): BoardStatsDisplay {
	const isPlayer = forceId === c.FORCE_ID_PLAYER;
	const boardX = isPlayer ? c.PLAYER_BOARD_X : c.CPU_BOARD_X;
	const boardY = isPlayer ? c.PLAYER_BOARD_Y : c.CPU_BOARD_Y;
	const boardHeight = c.TILE_HEIGHT * 3 + 8 * 2;

	const statsX = boardX + 50;
	const statsY = boardY + boardHeight + 120;

	const container = scene.add.container(statsX, statsY);

	const bgWidth = 800;
	const bgHeight = 80;
	const background = scene.add.rectangle(-100, -40, bgWidth, bgHeight, 0x000000, 0.5);
	background.setOrigin(0);

	const moraleText = scene.add.rexBBCodeText(0, 0, '[color=green]0[/color]')
		.setFontSize(28)
		.setFontFamily("'Arial Black', sans-serif")
		.setStroke("black", 14)
		.setAlign("center");
	const shieldText = scene.add.rexBBCodeText(200, 0, '[color=yellow]0[/color]')
		.setFontSize(28)
		.setFontFamily("'Arial Black', sans-serif")
		.setStroke("black", 14)
		.setAlign("center");
	const regenText = scene.add.rexBBCodeText(400, 0, '[color=#006400]0[/color]')
		.setFontSize(28)
		.setFontFamily("'Arial Black', sans-serif")
		.setStroke("black", 14)
		.setAlign("center");
	const poisonText = scene.add.rexBBCodeText(600, 0, '[color=purple]0[/color]')
		.setFontSize(28)
		.setFontFamily("'Arial Black', sans-serif")
		.setStroke("black", 14)
		.setAlign("center");

	moraleText.setOrigin(0.5);
	shieldText.setOrigin(0.5);
	regenText.setOrigin(0.5);
	poisonText.setOrigin(0.5);

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

	display.moraleText.setText(`[color=green]${force.morale}[/color]`);
	display.shieldText.setText(`[color=yellow]${force.shield}[/color]`);
	display.regenText.setText(`[color=#006400]${getTotalRegenHealing(forceId)}[/color]`);
	display.poisonText.setText(`[color=purple]${getTotalPoisonDamage(forceId)}[/color]`);
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
