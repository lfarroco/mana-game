import Phaser from 'phaser';
import * as c from '../../constants/constants';
import { cpuForce, playerForce } from '@Models/Entities/Force';
import { scene } from './BattlegroundScene';
import { getTotalRegenHealing } from './Systems/RegenSystem';
import { getTotalPoisonDamage } from './Systems/PoisonDamageSystem';

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
	const boardHeight = c.TILE_HEIGHT * 3 + 8 * 2;

	const statsX = boardX + 50;
	const statsY = boardY + boardHeight + 120;

	const container = scene.add.container(statsX, statsY);

	const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
		...c.titleTextConfig,
		fontSize: '28px',
		align: 'center'
	};

	const moraleText = scene.add.text(0, 0, 'morale: 0', textStyle);
	const shieldText = scene.add.text(200, 0, 'shield: 0', textStyle);
	const regenText = scene.add.text(400, 0, 'regen: 0', textStyle);
	const poisonText = scene.add.text(600, 0, 'poison: 0', textStyle);

	moraleText.setOrigin(0.5);
	shieldText.setOrigin(0.5);
	regenText.setOrigin(0.5);
	poisonText.setOrigin(0.5);

	container.add([moraleText, shieldText, regenText, poisonText]);

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

	display.moraleText.setText(`morale: ${force.morale}`);
	display.shieldText.setText(`shield: ${force.shield}`);
	display.regenText.setText(`regen: ${getTotalRegenHealing(forceId)}`);
	display.poisonText.setText(`poison: ${getTotalPoisonDamage(forceId)}`);
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
