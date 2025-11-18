import { createChip, updateChipText } from "@Components/Chip";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "@Constants/constants";
import { getCore } from "@Models/Entities/Card";
import { Container } from "@PhaserIO";

let playerStats: Phaser.GameObjects.Container | null = null;
let cpuStats: Phaser.GameObjects.Container | null = null;

export function createForceStats(force: string) {
	const x = force === FORCE_ID_PLAYER ? 300 : 1200;
	const y = 1000;

	const lifeDisplay = createChip(`life-display/${force}`, { x, y }, 0x29a1b9ff, "0");

	const shieldDisplay = createChip(`shield-display/${force}`, { x: x + 150, y }, 0xffff00, "0");

	const regenDisplay = createChip(`regen-display/${force}`, { x: x + 300, y }, 0x337a31, "0");

	const poisonDisplay = createChip(`poison-display/${force}`, { x: x + 450, y }, 0x9932cc, "0");

	const elements = [...lifeDisplay, ...shieldDisplay, ...regenDisplay, ...poisonDisplay];

	if (force === FORCE_ID_PLAYER) {
		playerStats?.destroy();
		playerStats = Container(elements);
	} else if (force === FORCE_ID_CPU) {
		cpuStats?.destroy();
		cpuStats = Container(elements);
	}

	updateAllStats(force);
}

export function destroyForceStats(force: string) {
	if (force === FORCE_ID_PLAYER) {
		playerStats?.destroy();
		playerStats = null;
	} else if (force === FORCE_ID_CPU) {
		cpuStats?.destroy();
		cpuStats = null;
	}
}

export function updateAllStats(force: string) {
	const core = getCore(force);
	updateLifeDisplay(force, core.life);
	updateShieldDisplay(force, core.shield);
	updateRegenDisplay(force, core.regen);
	updatePoisonDisplay(force, core.poison);
}

export function updateLifeDisplay(force: string, life: number) {
	updateChipText(`life-display/${force}`, Math.floor(life).toString());
}

export function updateShieldDisplay(force: string, shield: number) {
	updateChipText(`shield-display/${force}`, Math.floor(shield).toString());
}

export function updateRegenDisplay(force: string, regen: number) {
	updateChipText(`regen-display/${force}`, Math.floor(regen).toString());
}

export function updatePoisonDisplay(force: string, poison: number) {
	updateChipText(`poison-display/${force}`, Math.floor(poison).toString());
}
