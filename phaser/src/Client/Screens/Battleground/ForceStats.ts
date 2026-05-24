import { createChip, getChip, updateChipText } from "@Components/Chip";
import { hideTooltip, renderTooltip } from "@Components/Tooltip";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "@Constants/constants";
import * as i18n from "@i18n/i18n";
import { getBattleCore, getPlayerPersistentCore } from "@Models/Entities/Card";
import { Container, OnceDestroyed, Rectangle, Rect } from "@PhaserIO";
import * as CombatSystemStates from "@Systems/CombatSystemStates";
import { popText } from "@Systems/Chara/Animations";
import { compactNumber } from "@utils";
import Phaser from "phaser";
import { createLogger } from "@Utils/Logger";
import type { ForceStatsState } from "@Core/Combat/ForceStatsState";

const logger = createLogger("ForceStats");

export type { ForceStatsState } from "@Core/Combat/ForceStatsState";

type ForceStatsUpdateOptions = {
	preferPersistentCore?: boolean;
};

export function initializeForceStatsState(): ForceStatsState {
	return {
		playerStats: null,
		cpuStats: null,
		healthBars: new Map<string, Phaser.GameObjects.Graphics>(),
		shieldBars: new Map<string, Phaser.GameObjects.Graphics>(),
	};
}

export function createForceStats(state: ForceStatsState, force: string): ForceStatsState {
	const x = force === FORCE_ID_PLAYER ? 300 : 1200;
	const y = 1000;

	const lifeDisplay = createChip(`life-display/${force}`, { x, y }, 0x29a1b9ff, "0", 100);
	lifeDisplay.bg
		.setInteractive(Rect({ x: 0, y: 0 }, lifeDisplay.size), Phaser.Geom.Rectangle.Contains)
		.on("pointerover", () => {
			renderTooltip(
				x,
				y - 250,
				i18n.t("forceStats.life.title"),
				i18n.t("forceStats.life.description")
			);
		})
		.on("pointerout", () => {
			hideTooltip();
		});

	const shieldDisplay = createChip(
		`shield-display/${force}`,
		{ x: x + 150, y },
		0xffff00,
		"0",
		100
	);
	shieldDisplay.bg
		.setInteractive(Rect({ x: 0, y: 0 }, shieldDisplay.size), Phaser.Geom.Rectangle.Contains)
		.on("pointerover", () => {
			renderTooltip(
				x + 150,
				y - 250,
				i18n.t("forceStats.shield.title"),
				i18n.t("forceStats.shield.description")
			);
		})
		.on("pointerout", () => {
			hideTooltip();
		});

	const regenDisplay = createChip(`regen-display/${force}`, { x: x + 300, y }, 0x337a31, "0", 100);
	regenDisplay.bg
		.setInteractive(Rect({ x: 0, y: 0 }, regenDisplay.size), Phaser.Geom.Rectangle.Contains)
		.on("pointerover", () => {
			renderTooltip(
				x + 300,
				y - 250,
				i18n.t("forceStats.regen.title"),
				i18n.t("forceStats.regen.description")
			);
		})
		.on("pointerout", () => {
			hideTooltip();
		});

	const poisonDisplay = createChip(
		`poison-display/${force}`,
		{ x: x + 450, y },
		0x9932cc,
		"0",
		100
	);
	poisonDisplay.bg
		.setInteractive(Rect({ x: 0, y: 0 }, poisonDisplay.size), Phaser.Geom.Rectangle.Contains)
		.on("pointerover", () => {
			renderTooltip(
				x + 450,
				y - 250,
				i18n.t("forceStats.poison.title"),
				i18n.t("forceStats.poison.description")
			);
		})
		.on("pointerout", () => {
			hideTooltip();
		});

	const barWidth = 600;
	const barHeight = 20;
	const healthBarPos = { x: x + 225, y: y + 60 };
	const shieldBarPos = { x: x + 225, y: y + 40 };

	const bgBar = Rectangle(healthBarPos, { width: barWidth, height: barHeight }, 0x000000, 0.5);
	const healthBar = Rectangle(healthBarPos, { width: barWidth, height: barHeight }, 0x29a1b9ff, 1);
	healthBar
		.setInteractive(
			Rect({ x: 0, y: 0 }, { width: barWidth, height: barHeight }),
			Phaser.Geom.Rectangle.Contains
		)
		.on("pointerover", () => {
			renderTooltip(
				x + 225,
				y - 250,
				i18n.t("forceStats.healthBar.title"),
				i18n.t("forceStats.healthBar.description")
			);
		})
		.on("pointerout", () => {
			hideTooltip();
		});

	const bgShieldBar = Rectangle(
		shieldBarPos,
		{ width: barWidth, height: barHeight },
		0x000000,
		0.5
	);
	const shieldBar = Rectangle(shieldBarPos, { width: barWidth, height: barHeight }, 0xffff00, 1);
	shieldBar.clear();
	shieldBar
		.setInteractive(
			Rect({ x: 0, y: 0 }, { width: barWidth, height: barHeight }),
			Phaser.Geom.Rectangle.Contains
		)
		.on("pointerover", () => {
			renderTooltip(
				x + 225,
				y - 250,
				i18n.t("forceStats.shieldBar.title"),
				i18n.t("forceStats.shieldBar.description")
			);
		})
		.on("pointerout", () => {
			hideTooltip();
		});

	const newHealthBars = new Map(state.healthBars);
	const newShieldBars = new Map(state.shieldBars);

	newHealthBars.set(force, healthBar);
	newShieldBars.set(force, shieldBar);

	OnceDestroyed(healthBar, () => newHealthBars.delete(force));
	OnceDestroyed(shieldBar, () => newShieldBars.delete(force));

	const elements = [
		lifeDisplay.container,
		shieldDisplay.container,
		regenDisplay.container,
		poisonDisplay.container,
		bgBar,
		healthBar,
		bgShieldBar,
		shieldBar,
	];

	const newState = {
		...state,
		healthBars: newHealthBars,
		shieldBars: newShieldBars,
	};

	if (force === FORCE_ID_PLAYER) {
		newState.playerStats?.destroy();
		newState.playerStats = Container(elements);
		newState.playerStats.setDepth(1000); // Ensure it's on top
	} else if (force === FORCE_ID_CPU) {
		newState.cpuStats?.destroy();
		newState.cpuStats = Container(elements);
		newState.cpuStats.setDepth(1000); // Ensure it's on top
	}

	return newState;
}

export function ensureForceStats(state: ForceStatsState, force: string): ForceStatsState {
	if (force === FORCE_ID_PLAYER && state.playerStats) {
		return state;
	}

	if (force === FORCE_ID_CPU && state.cpuStats) {
		return state;
	}

	return createForceStats(state, force);
}

export function destroyForceStats(state: ForceStatsState, force: string): ForceStatsState {
	const newState = { ...state };

	if (force === FORCE_ID_PLAYER) {
		newState.playerStats?.destroy();
		newState.playerStats = null;
	} else if (force === FORCE_ID_CPU) {
		newState.cpuStats?.destroy();
		newState.cpuStats = null;
	}

	return newState;
}

export function updateLifeDisplay(
	force: string,
	life: number,
	delta: number,
	state?: ForceStatsState,
	options?: ForceStatsUpdateOptions
) {
	let forceStatsState: ForceStatsState;

	if (state) {
		forceStatsState = state;
	} else {
		const combatStates = CombatSystemStates.getCombatSystemStates();
		forceStatsState = combatStates.forceStatsState;
	}

	const chipId = `life-display/${force}`;

	updateChipText(chipId, compactNumber(life));

	const bar = forceStatsState.healthBars.get(force);
	if (!bar) {
		logger.error(`No health bar found for force ${force}`);
		return;
	}
	const core = getForceStatsCore(force, options);
	if (!core) {
		logger.warn(`[ForceStats] Core not found for force ${force} in updateLifeDisplay`);
		return;
	}
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

	const chip = getChip(chipId);

	if (!chip) {
		logger.error("No chip found for id", chipId);
		return;
	}

	const textElement = popText({
		x: 0,
		y: 0,
		type: delta > 0 ? "heal" : "damage",
		text: delta.toFixed(0),
	});

	chip.container.add(textElement);
}

export function updateShieldDisplay(
	force: string,
	shield: number,
	delta: number,
	statsState?: ForceStatsState,
	options?: ForceStatsUpdateOptions
) {
	let forceStatsState: ForceStatsState;

	if (statsState) {
		forceStatsState = statsState;
	} else {
		const combatStates = CombatSystemStates.getCombatSystemStates();
		forceStatsState = combatStates.forceStatsState;
	}

	const chipId = `shield-display/${force}`;
	updateChipText(chipId, compactNumber(shield));

	const bar = forceStatsState.shieldBars.get(force);

	if (!bar) {
		logger.error("No bar for force", force);
		return;
	}

	const core = getForceStatsCore(force, options, state);
	if (!core) {
		logger.warn(`[ForceStats] Core not found for force ${force} in updateShieldDisplay`);
		return;
	}
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

	const chip = getChip(chipId);

	if (!chip) {
		logger.error("No chip found for id", chipId);
		return;
	}

	const textElement = popText({
		x: 0,
		y: 0,
		type: delta > 0 ? "shield" : "damage",
		text: delta > 0 ? "+" + delta.toFixed(0) : delta.toFixed(0),
	});

	chip.container.add(textElement);
}

export function syncPlayerPersistentForceStats(statsState?: ForceStatsState): ForceStatsState {
	const playerCore = getPlayerPersistentCore(state);
	if (!playerCore) {
		logger.warn("[ForceStats] Player persistent core not found");
		return statsState ?? initializeForceStatsState();
	}

	let forceStatsState = statsState;
	if (!forceStatsState) {
		forceStatsState = CombatSystemStates.isInitialized()
			? CombatSystemStates.getCombatSystemStates().forceStatsState
			: initializeForceStatsState();
	}

	forceStatsState = ensureForceStats(forceStatsState, FORCE_ID_PLAYER);
	updateLifeDisplay(FORCE_ID_PLAYER, playerCore.life, 0, forceStatsState, {
		preferPersistentCore: true,
	});
	updateShieldDisplay(FORCE_ID_PLAYER, playerCore.shield, 0, forceStatsState, {
		preferPersistentCore: true,
	});
	updateRegenDisplay(FORCE_ID_PLAYER, 0, 0);
	updatePoisonDisplay(FORCE_ID_PLAYER, 0, 0);

	return forceStatsState;
}

function getForceStatsCore(
	force: string,
	options?: ForceStatsUpdateOptions,
	gameState = state
) {
	if (options?.preferPersistentCore && force === FORCE_ID_PLAYER) {
		return getPlayerPersistentCore(gameState);
	}

	return (
		getBattleCore(gameState)(force) ||
		(force === FORCE_ID_PLAYER ? getPlayerPersistentCore(gameState) : null)
	);
}

export function updateRegenDisplay(force: string, regen: number, delta: number) {
	const chipId = `regen-display/${force}`;

	const chip = getChip(chipId);
	if (!chip) {
		return;
	}

	updateChipText(chipId, compactNumber(regen));

	if (delta === 0) return;

	const textElement = popText({
		x: 0,
		y: 0,
		type: "regen",
		text: "+" + delta.toFixed(0),
	});

	chip.container.add(textElement);
}

export function updatePoisonDisplay(force: string, poison: number, delta: number) {
	const chipId = `poison-display/${force}`;

	const chip = getChip(chipId);
	if (!chip) {
		return;
	}

	updateChipText(chipId, compactNumber(poison));

	if (delta === 0) return;

	const textElement = popText({
		x: 0,
		y: 0,
		type: delta > 0 ? "poison" : "heal",
		text: delta > 0 ? "+" + delta.toFixed(0) : delta.toFixed(0),
	});

	chip.container.add(textElement);
}
