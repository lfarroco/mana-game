import * as Chip from "@Components/Chip/Chip";
import * as Tooltip from "@Components/Tooltip/Tooltip";
import * as Constants from "@Constants";
import * as i18n from "@i18n/i18n";
import * as Card from "@Models/Entities/Card";
import * as CombatSystemStates from "@Systems/CombatSystemStates";
import * as Animations from "@Systems/Chara/Animations";
import * as Utils from "@utils";
import * as Logger from "@Utils/Logger";
import * as ForceStatsState from "@Core/Combat/ForceStatsState";

const logger = Logger.createLogger("ForceStats");

export type { ForceStatsState } from "@Core/Combat/ForceStatsState";

type ForceStatsUpdateOptions = {
	preferPersistentCore?: boolean;
};

export function initializeForceStatsState(): ForceStatsState.ForceStatsState {
	return {
		playerStats: null,
		cpuStats: null,
		healthBars: new Map<string, Phaser.GameObjects.Graphics>(),
		shieldBars: new Map<string, Phaser.GameObjects.Graphics>(),
	};
}

export function createForceStats(state: ForceStatsState.ForceStatsState, force: string): ForceStatsState.ForceStatsState {
	const x = force === Constants.FORCE_ID_PLAYER ? 300 : 1200;
	const y = 1000;

	const lifeDisplay = Chip.createChip(`life-display/${force}`, [x, y], 0x29a1b9ff, "0", 100);
	lifeDisplay.bg
		.setInteractive(io.Rect([0, 0], lifeDisplay.size), Phaser.Geom.Rectangle.Contains)
		.on("pointerover", () => {
			Tooltip.renderTooltip(
				x,
				y - 250,
				i18n.t("forceStats.life.title"),
				i18n.t("forceStats.life.description")
			);
		})
		.on("pointerout", () => {
			Tooltip.hideTooltip();
		});

	const shieldDisplay = Chip.createChip(
		`shield-display/${force}`,
		[x + 150, y],
		0xffff00,
		"0",
		100
	);
	shieldDisplay.bg
		.setInteractive(io.Rect([0, 0], shieldDisplay.size), Phaser.Geom.Rectangle.Contains)
		.on("pointerover", () => {
			Tooltip.renderTooltip(
				x + 150,
				y - 250,
				i18n.t("forceStats.shield.title"),
				i18n.t("forceStats.shield.description")
			);
		})
		.on("pointerout", () => {
			Tooltip.hideTooltip();
		});

	const regenDisplay = Chip.createChip(`regen-display/${force}`, [x + 300, y], 0x337a31, "0", 100);
	regenDisplay.bg
		.setInteractive(io.Rect([0, 0], regenDisplay.size), Phaser.Geom.Rectangle.Contains)
		.on("pointerover", () => {
			Tooltip.renderTooltip(
				x + 300,
				y - 250,
				i18n.t("forceStats.regen.title"),
				i18n.t("forceStats.regen.description")
			);
		})
		.on("pointerout", () => {
			Tooltip.hideTooltip();
		});

	const poisonDisplay = Chip.createChip(
		`poison-display/${force}`,
		[x + 450, y],
		0x9932cc,
		"0",
		100
	);
	poisonDisplay.bg
		.setInteractive(io.Rect([0, 0], poisonDisplay.size), Phaser.Geom.Rectangle.Contains)
		.on("pointerover", () => {
			Tooltip.renderTooltip(
				x + 450,
				y - 250,
				i18n.t("forceStats.poison.title"),
				i18n.t("forceStats.poison.description")
			);
		})
		.on("pointerout", () => {
			Tooltip.hideTooltip();
		});

	const barWidth = 600;
	const barHeight = 20;
	const healthBarPos = [x + 225, y + 60] as Vec2;
	const shieldBarPos = [x + 225, y + 40] as Vec2;

	const bgBar = io.Rectangle(healthBarPos, [barWidth, barHeight], 0x000000, 0.5);
	const healthBar = io.Rectangle(healthBarPos, [barWidth, barHeight], 0x29a1b9ff, 1);
	healthBar
		.setInteractive(
			io.Rect([0, 0], [barWidth, barHeight]),
			Phaser.Geom.Rectangle.Contains
		)
		.on("pointerover", () => {
			Tooltip.renderTooltip(
				x + 225,
				y - 250,
				i18n.t("forceStats.healthBar.title"),
				i18n.t("forceStats.healthBar.description")
			);
		})
		.on("pointerout", () => {
			Tooltip.hideTooltip();
		});

	const bgShieldBar = io.Rectangle(
		shieldBarPos,
		[barWidth, barHeight],
		0x000000,
		0.5
	);
	const shieldBar = io.Rectangle(shieldBarPos, [barWidth, barHeight], 0xffff00, 1);
	shieldBar.clear();
	shieldBar
		.setInteractive(
			io.Rect([0, 0], [barWidth, barHeight]),
			Phaser.Geom.Rectangle.Contains
		)
		.on("pointerover", () => {
			Tooltip.renderTooltip(
				x + 225,
				y - 250,
				i18n.t("forceStats.shieldBar.title"),
				i18n.t("forceStats.shieldBar.description")
			);
		})
		.on("pointerout", () => {
			Tooltip.hideTooltip();
		});

	const newHealthBars = new Map(state.healthBars);
	const newShieldBars = new Map(state.shieldBars);

	newHealthBars.set(force, healthBar);
	newShieldBars.set(force, shieldBar);

	io.OnceDestroyed(healthBar, () => newHealthBars.delete(force));
	io.OnceDestroyed(shieldBar, () => newShieldBars.delete(force));

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

	if (force === Constants.FORCE_ID_PLAYER) {
		newState.playerStats?.destroy();
		newState.playerStats = io.Container(elements);
		newState.playerStats.setDepth(1000); // Ensure it's on top
	} else if (force === Constants.FORCE_ID_CPU) {
		newState.cpuStats?.destroy();
		newState.cpuStats = io.Container(elements);
		newState.cpuStats.setDepth(1000); // Ensure it's on top
	}

	return newState;
}

export function ensureForceStats(state: ForceStatsState.ForceStatsState, force: string): ForceStatsState.ForceStatsState {
	if (force === Constants.FORCE_ID_PLAYER && state.playerStats) {
		return state;
	}

	if (force === Constants.FORCE_ID_CPU && state.cpuStats) {
		return state;
	}

	return createForceStats(state, force);
}

export function destroyForceStats(state: ForceStatsState.ForceStatsState, force: string): ForceStatsState.ForceStatsState {
	const newState = { ...state };

	if (force === Constants.FORCE_ID_PLAYER) {
		newState.playerStats?.destroy();
		newState.playerStats = null;
	} else if (force === Constants.FORCE_ID_CPU) {
		newState.cpuStats?.destroy();
		newState.cpuStats = null;
	}

	return newState;
}

export function updateLifeDisplay(
	force: string,
	life: number,
	delta: number,
	state?: ForceStatsState.ForceStatsState,
	options?: ForceStatsUpdateOptions
) {
	let forceStatsState: ForceStatsState.ForceStatsState;

	if (state) {
		forceStatsState = state;
	} else {
		const combatStates = CombatSystemStates.getCombatSystemStates();
		forceStatsState = combatStates.forceStatsState;
	}

	const chipId = `life-display/${force}`;

	Chip.updateChipText(chipId, Utils.compactNumber(life));

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

	if (force === Constants.FORCE_ID_PLAYER) {
		bar.fillRect(barWidth * (1 - percent), 0, barWidth * percent, barHeight);
	} else {
		bar.fillRect(0, 0, barWidth * percent, barHeight);
	}

	if (delta === 0) return;

	const chip = Chip.getChip(chipId);

	if (!chip) {
		logger.error("No chip found for id", chipId);
		return;
	}

	const textElement = Animations.popText({
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
	statsState?: ForceStatsState.ForceStatsState,
	options?: ForceStatsUpdateOptions
) {
	let forceStatsState: ForceStatsState.ForceStatsState;

	if (statsState) {
		forceStatsState = statsState;
	} else {
		const combatStates = CombatSystemStates.getCombatSystemStates();
		forceStatsState = combatStates.forceStatsState;
	}

	const chipId = `shield-display/${force}`;
	Chip.updateChipText(chipId, Utils.compactNumber(shield));

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

	if (force === Constants.FORCE_ID_PLAYER) {
		bar.fillRect(barWidth * (1 - percent), 0, barWidth * percent, barHeight);
	} else {
		bar.fillRect(0, 0, barWidth * percent, barHeight);
	}

	if (delta === 0) return;

	const chip = Chip.getChip(chipId);

	if (!chip) {
		logger.error("No chip found for id", chipId);
		return;
	}

	const textElement = Animations.popText({
		x: 0,
		y: 0,
		type: delta > 0 ? "shield" : "damage",
		text: delta > 0 ? "+" + delta.toFixed(0) : delta.toFixed(0),
	});

	chip.container.add(textElement);
}

export function syncPlayerPersistentForceStats(statsState?: ForceStatsState.ForceStatsState): ForceStatsState.ForceStatsState {
	const playerCore = Card.getPlayerPersistentCore(state);
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

	forceStatsState = ensureForceStats(forceStatsState, Constants.FORCE_ID_PLAYER);
	updateLifeDisplay(Constants.FORCE_ID_PLAYER, playerCore.life, 0, forceStatsState, {
		preferPersistentCore: true,
	});
	updateShieldDisplay(Constants.FORCE_ID_PLAYER, playerCore.shield, 0, forceStatsState, {
		preferPersistentCore: true,
	});
	updateRegenDisplay(Constants.FORCE_ID_PLAYER, 0, 0);
	updatePoisonDisplay(Constants.FORCE_ID_PLAYER, 0, 0);

	return forceStatsState;
}

function getForceStatsCore(
	force: string,
	options?: ForceStatsUpdateOptions,
	gameState = state
) {
	if (options?.preferPersistentCore && force === Constants.FORCE_ID_PLAYER) {
		return Card.getPlayerPersistentCore(gameState);
	}

	return (
		Card.getBattleCore(gameState)(force) ||
		(force === Constants.FORCE_ID_PLAYER ? Card.getPlayerPersistentCore(gameState) : null)
	);
}

export function updateRegenDisplay(force: string, regen: number, delta: number) {
	const chipId = `regen-display/${force}`;

	const chip = Chip.getChip(chipId);
	if (!chip) {
		return;
	}

	Chip.updateChipText(chipId, Utils.compactNumber(regen));

	if (delta === 0) return;

	const textElement = Animations.popText({
		x: 0,
		y: 0,
		type: "regen",
		text: "+" + delta.toFixed(0),
	});

	chip.container.add(textElement);
}

export function updatePoisonDisplay(force: string, poison: number, delta: number) {
	const chipId = `poison-display/${force}`;

	const chip = Chip.getChip(chipId);
	if (!chip) {
		return;
	}

	Chip.updateChipText(chipId, Utils.compactNumber(poison));

	if (delta === 0) return;

	const textElement = Animations.popText({
		x: 0,
		y: 0,
		type: delta > 0 ? "poison" : "heal",
		text: delta > 0 ? "+" + delta.toFixed(0) : delta.toFixed(0),
	});

	chip.container.add(textElement);
}
