import { createChip, getChip, updateChipText } from "@Components/Chip";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "@Constants/constants";
import { getCore } from "@Models/Entities/Card";
import { Container, OnceDestroyed, Rectangle } from "@PhaserIO";
import { getPoisonRate } from "./Systems/PoisonDamageSystem";
import { getRegenRate } from "./Systems/RegenSystem";
import { popText } from "@Systems/Chara/Animations";

let playerStats: Phaser.GameObjects.Container | null = null;
let cpuStats: Phaser.GameObjects.Container | null = null;

const healthBars = new Map<string, Phaser.GameObjects.Graphics>();
const shieldBars = new Map<string, Phaser.GameObjects.Graphics>();

export function createForceStats(force: string) {
	const x = force === FORCE_ID_PLAYER ? 300 : 1200;
	const y = 1000;

	const lifeDisplay = createChip(`life-display/${force}`, { x, y }, 0x29a1b9ff, "0", 100);

	const shieldDisplay = createChip(`shield-display/${force}`, { x: x + 150, y }, 0xffff00, "0", 100);

	const regenDisplay = createChip(`regen-display/${force}`, { x: x + 300, y }, 0x337a31, "0", 100);

	const poisonDisplay = createChip(`poison-display/${force}`, { x: x + 450, y }, 0x9932cc, "0", 100);

	const barWidth = 600;
	const barHeight = 20;
	const healthBarPos = { x: x + 225, y: y + 60 };
	const shieldBarPos = { x: x + 225, y: y + 40 };

	const bgBar = Rectangle(healthBarPos, { width: barWidth, height: barHeight }, 0x000000, 0.5);
	const healthBar = Rectangle(healthBarPos, { width: barWidth, height: barHeight }, 0x29a1b9ff, 1);

	const bgShieldBar = Rectangle(shieldBarPos, { width: barWidth, height: barHeight }, 0x000000, 0.5);
	const shieldBar = Rectangle(shieldBarPos, { width: barWidth, height: barHeight }, 0xffff00, 1);

	healthBars.set(force, healthBar);
	shieldBars.set(force, shieldBar);

	OnceDestroyed(healthBar, () => healthBars.delete(force));
	OnceDestroyed(shieldBar, () => shieldBars.delete(force));

	const elements = [
		...lifeDisplay,
		...shieldDisplay,
		...regenDisplay,
		...poisonDisplay,
		bgBar,
		healthBar,
		bgShieldBar,
		shieldBar,
	];

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
	updateLifeDisplay(force, core.life, 0);
	updateShieldDisplay(force, core.shield, 0);
	updateRegenDisplay(force, getRegenRate(force), 0);
	updatePoisonDisplay(force, getPoisonRate(force), 0);
}

export function updateLifeDisplay(force: string, life: number, delta: number) {

	const chipId = `life-display/${force}`;

	updateChipText(chipId, Math.floor(life).toString());

	const bar = healthBars.get(force);
	if (!bar) {
		console.error(`No health bar found for force ${force}`);
		return;
	}
	const core = getCore(force);
	const maxLife = core.maxLife || 1;
	const percent = Math.max(0, Math.min(1, life / maxLife));
	const barWidth = 600;
	const barHeight = 20;

	bar.clear();
	bar.fillStyle(0x29a1b9ff, 1);

	if (force === FORCE_ID_PLAYER) {
		bar.fillRect(barWidth * (1 - percent), 0, barWidth * percent, barHeight);
	} else {
		bar.fillRect(0, 0, barWidth * percent, barHeight);
	}

	if (delta === 0) return;

	const chip = getChip(chipId)

	if (!chip) {
		console.error("No chip found for id", chipId);
		return;
	}

	popText({
		x: chip?.text.getCenter().x,
		y: chip?.text.getCenter().y,
		type: delta > 0 ? "heal" : "damage",
		text: delta.toString()
	});

}

export function updateShieldDisplay(
	force: string,
	shield: number,
	delta: number
) {
	const chipId = `shield-display/${force}`;
	updateChipText(chipId, Math.floor(shield).toString());

	const bar = shieldBars.get(force);

	if (!bar) {
		console.error("No bar for force", force);
		return;
	}

	const core = getCore(force);
	const maxLife = core.maxLife || 1;
	const percent = Math.max(0, Math.min(1, shield / maxLife));
	const barWidth = 600;
	const barHeight = 20;

	bar.clear();
	bar.fillStyle(0xffff00, 1);

	if (force === FORCE_ID_PLAYER) {
		bar.fillRect(barWidth * (1 - percent), 0, barWidth * percent, barHeight);
	} else {
		bar.fillRect(0, 0, barWidth * percent, barHeight);
	}

	if (delta === 0) return;

	const chip = getChip(chipId)

	if (!chip) {
		console.error("No chip found for id", chipId);
		return;
	}

	popText({
		x: chip?.text.getCenter().x,
		y: chip?.text.getCenter().y,
		type: delta > 0 ? "shield" : "damage",
		text: delta.toString()
	})

}

export function updateRegenDisplay(force: string, regen: number, delta: number) {
	const chipId = `regen-display/${force}`;
	updateChipText(chipId, Math.floor(regen).toString());

	if (delta === 0) return;

	const chip = getChip(chipId);

	if (!chip) {
		console.error("No chip found for id", chipId);
		return;
	}

	popText({
		x: chip.text.getCenter().x,
		y: chip.text.getCenter().y,
		type: "regen",
		text: "+" + delta.toFixed(0).toString()
	});
}

export function updatePoisonDisplay(force: string, poison: number, delta: number) {
	const chipId = `poison-display/${force}`;
	updateChipText(chipId, Math.floor(poison).toString());

	if (delta === 0) return;

	const chip = getChip(chipId);

	if (!chip) {
		console.error("No chip found for id", chipId);
		return;
	}

	popText({
		x: chip.text.getCenter().x,
		y: chip.text.getCenter().y,
		type: delta > 0 ? "poison" : "heal",
		text: delta > 0 ? '+' : '-' + delta.toFixed(0).toString()
	});
}
