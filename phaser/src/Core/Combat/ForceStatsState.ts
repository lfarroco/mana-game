import type Phaser from "phaser";

export type ForceStatsState = {
	playerStats: Phaser.GameObjects.Container | null;
	cpuStats: Phaser.GameObjects.Container | null;
	healthBars: Map<string, Phaser.GameObjects.Graphics>;
	shieldBars: Map<string, Phaser.GameObjects.Graphics>;
};

export function initializeForceStatsState(): ForceStatsState {
	return {
		playerStats: null,
		cpuStats: null,
		healthBars: new Map<string, Phaser.GameObjects.Graphics>(),
		shieldBars: new Map<string, Phaser.GameObjects.Graphics>(),
	};
}