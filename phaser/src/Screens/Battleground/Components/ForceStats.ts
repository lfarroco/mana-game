import * as Chip from "@Components/Chip/Chip";
import * as Tooltip from "@Components/Tooltip/Tooltip";
import * as Constants from "@game/Constants";
import * as i18n from "@i18n/i18n";
import * as Card from "@game/Entities/Card";
import { Unit } from "@game/Models";
import * as Animations from "@Systems/Chara/Animations";
import * as Utils from "@utils";
import { env } from "@Env";
import { makeContainer, centeredRect } from "@Env";

const initialForceStats: () => ForceStats = () => ({
	display: null,
	healthBar: null,
	shieldBar: null,
	life: 0,
	shield: 0,
	poison: 0,
	regen: 0
})

const statsState: ForceStatsState = ({
	player: initialForceStats(),
	cpu: initialForceStats(),
});

let currentCombatState: import("@game/Models").CombatState | undefined;
let currentSession: import("@game/Models").SessionData | undefined;

export function setCombatClientState() {
	currentCombatState = env.state.combatState;
	currentSession = env.state.session;
}

export const createForceStats = () => {
	setCombatClientState();
	[
		Constants.FORCE_ID_PLAYER,
		Constants.FORCE_ID_CPU,
	]
		.forEach(createStatsForForce)
}


const createStatsForForce = (force: string) => {
	const x = force === Constants.FORCE_ID_PLAYER ? 300 : 1200;
	const y = 1000;

	const stats = force === Constants.FORCE_ID_PLAYER ?
		statsState.player :
		statsState.cpu;

	stats.display?.destroy();

	const core = Card.getBattleCore(currentCombatState!)(force);

	const lifeDisplay = createLifeDisplay([x, y], core);

	const shieldDisplay = createShieldDisplay(force, [x, y], core);

	const regenDisplay = createRegenDisplay(force, [x, y]);

	const poisonDisplay = createPoisonDisplay(force, [x, y]);

	const barWidth = 600;
	const barHeight = 20;
	const healthBarPos = [x + 225, y + 60] as Vec2;
	const shieldBarPos = [x + 225, y + 40] as Vec2;

	const { healthBar, bgBar } = createHealthBar(healthBarPos, barWidth, barHeight, [x, y]);

	const { shieldBar, bgShieldBar } = createShieldbar(shieldBarPos, barWidth, barHeight, [x, y]);

	stats.healthBar = healthBar;
	stats.shieldBar = shieldBar;

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

	stats.display = makeContainer(env.scene, elements);
}

function createShieldbar(
	shieldBarPos: Vec2,
	barWidth: number,
	barHeight: number,
	[x, y]: Vec2,
) {
	const bgShieldBar = centeredRect(
		env.scene,
		shieldBarPos,
		[barWidth, barHeight],
		0x000000,
		0.5
	);
	const shieldBar = centeredRect(env.scene, shieldBarPos, [barWidth, barHeight], 0xffff00, 1);
	shieldBar.clear();
	shieldBar
		.setInteractive(
			new Phaser.Geom.Rectangle(0, 0, barWidth, barHeight),
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
	return { shieldBar, bgShieldBar };
}

function createHealthBar(
	healthBarPos: Vec2,
	barWidth: number,
	barHeight: number,
	[x, y]: Vec2,
) {
	const bgBar = centeredRect(env.scene, healthBarPos, [barWidth, barHeight], 0x000000, 0.5);
	const healthBar = centeredRect(env.scene, healthBarPos, [barWidth, barHeight], 0x29a1b9ff, 1);
	healthBar
		.setInteractive(
			new Phaser.Geom.Rectangle(0, 0, barWidth, barHeight),
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
	return { healthBar, bgBar };
}

function createPoisonDisplay(
	force: string,
	[x, y]: Vec2,
) {
	const poisonDisplay = Chip.createChip(
		`poison-display/${force}`,
		[x + 450, y],
		0x9932cc,
		"0",
		100
	);
	poisonDisplay.bg
		.setInteractive(new Phaser.Geom.Rectangle(0, 0, ...poisonDisplay.size), Phaser.Geom.Rectangle.Contains)
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
	return poisonDisplay;
}

function createRegenDisplay(
	force: string,
	[x, y]: Vec2,
) {
	const regenDisplay = Chip.createChip(`regen-display/${force}`, [x + 300, y], 0x337a31, "0", 100);
	regenDisplay.bg.on(Phaser.Input.Events.POINTER_OVER,
		() => {
			Tooltip.renderTooltip(
				x + 300,
				y - 250,
				i18n.t("forceStats.regen.title"),
				i18n.t("forceStats.regen.description")
			);
		});
	regenDisplay.bg.on(Phaser.Input.Events.POINTER_OUT,
		Tooltip.hideTooltip
	);
	return regenDisplay;
}

function createShieldDisplay(
	force: string,
	[x, y]: Vec2,
	core: Unit,
) {
	const shieldDisplayId = `shield-display/${force}`;
	const shieldDisplay = Chip.createChip(
		shieldDisplayId,
		[x + 150, y],
		0xffff00,
		"0",
		100
	);
	shieldDisplay.bg
		.setInteractive(new Phaser.Geom.Rectangle(0, 0, ...shieldDisplay.size), Phaser.Geom.Rectangle.Contains)
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
	Chip.updateChipText(shieldDisplayId, core.shield.toString());
	return shieldDisplay;
}

function createLifeDisplay(
	[x, y]: Vec2,
	core: Unit,
) {
	const lifeDisplayId = `life-display/${core.force}`;

	const lifeDisplay = Chip.createChip(lifeDisplayId, [x, y], 0x29a1b9ff, "0", 100);

	lifeDisplay.bg.on(Phaser.Input.Events.POINTER_OVER, () => {
		Tooltip.renderTooltip(
			x,
			y - 250,
			i18n.t("forceStats.life.title"),
			i18n.t("forceStats.life.description")
		);
	});
	lifeDisplay.bg.on(Phaser.Input.Events.POINTER_OUT, Tooltip.hideTooltip);

	Chip.updateChipText(lifeDisplayId, core.life.toString());
	return lifeDisplay;
}

function getForceStats(force: string) {
	return force === Constants.FORCE_ID_PLAYER ? statsState.player : statsState.cpu;
}

export function updateLifeDisplay(
	force: string,
	life: number,
	delta: number,
) {

	if (delta === 0) return;

	const stats = getForceStats(force);

	const chipId = `life-display/${force}`;

	Chip.updateChipText(chipId, Utils.compactNumber(life));

	const bar = stats.healthBar;
	if (!bar) {
		console.error("ForceStats", `No health bar found for force ${force}`);
		return;
	}
	const core = Card.getBattleCore(currentCombatState!)(force);
	const percent = Math.max(0, Math.min(1, life / core.maxLife));
	const barWidth = 600;
	const barHeight = 20;

	bar.clear();
	bar.fillStyle(0x29a1b9ff, 1);

	if (force === Constants.FORCE_ID_PLAYER) {
		bar.fillRect(barWidth * (1 - percent), 0, barWidth * percent, barHeight);
	} else {
		bar.fillRect(0, 0, barWidth * percent, barHeight);
	}


	const chip = Chip.getChip(chipId);

	if (!chip) {
		console.error("ForceStats", "No chip found for id", chipId);
		return;
	}

	const textElement = Animations.popText({
		// TOOD: use pos:Vec2
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
) {
	if (delta === 0) return;

	const chipId = `shield-display/${force}`;
	Chip.updateChipText(chipId, Utils.compactNumber(shield));

	const bar = getForceStats(force).shieldBar;

	if (!bar) {
		console.error("ForceStats", "No bar for force", force);
		return;
	}

	const core = Card.getBattleCore(currentCombatState!)(force);
	const percent = Math.max(0, Math.min(1, shield / core.maxLife));
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
		console.error("ForceStats", "No chip found for id", chipId);
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

// FIXME: replace force:string parameter with targetUnit:Unit so callers don't
// need to track force IDs separately — locate the force from the unit.
export function updateRegenDisplay(
	force: string,
	regen: number,
	delta: number,
) {
	if (delta === 0) return;

	const chipId = `regen-display/${force}`;

	const chip = Chip.getChip(chipId);
	if (!chip) {
		return;
	}

	Chip.updateChipText(chipId, Utils.compactNumber(regen));

	const textElement = Animations.popText({
		x: 0,
		y: 0,
		type: "regen",
		text: "+" + delta.toFixed(0),
	});

	chip.container.add(textElement);
}

export function updatePoisonDisplay(
	force: string,
	poison: number,
	delta: number,
) {
	if (delta === 0) return;

	const chipId = `poison-display/${force}`;

	const chip = Chip.getChip(chipId);
	if (!chip)
		throw new Error("invalid client state")

	Chip.updateChipText(chipId, Utils.compactNumber(poison));

	const textElement = Animations.popText({
		x: 0,
		y: 0,
		type: delta > 0 ? "poison" : "heal",
		text: delta > 0 ? "+" + delta.toFixed(0) : delta.toFixed(0),
	});

	chip.container.add(textElement);
}

export function destroyForceStats(force: string) {
	const stats = getForceStats(force);
	stats.display?.destroy();
	stats.display = null;
	stats.healthBar = null;
	stats.shieldBar = null;
	stats.life = 0;
	stats.shield = 0;
	stats.regen = 0;
	stats.poison = 0;
}

export function resetPlayerForceStats() {
	const playerStats = statsState.player;

	const { healthBar, shieldBar, display } = playerStats;

	if (!healthBar || !shieldBar || !display) throw new Error("invalid state");

	const core = Card.getPlayerPersistentCore(currentSession!);

	if (!core) throw new Error("invalid state");

	const barWidth = 600;
	const barHeight = 20;
	const percent = Math.max(0, Math.min(1, core.life / core.maxLife));

	healthBar.clear();
	healthBar.fillStyle(0x29a1b9ff, 1);
	healthBar.fillRect(barWidth * (1 - percent), 0, barWidth * percent, barHeight);

	shieldBar.clear();

	// Reset chip texts to reflect post-combat state
	Chip.updateChipText(`life-display/${Constants.FORCE_ID_PLAYER}`, Utils.compactNumber(core.life));
	Chip.updateChipText(`shield-display/${Constants.FORCE_ID_PLAYER}`, Utils.compactNumber(0));
	Chip.updateChipText(`regen-display/${Constants.FORCE_ID_PLAYER}`, Utils.compactNumber(0));
	Chip.updateChipText(`poison-display/${Constants.FORCE_ID_PLAYER}`, Utils.compactNumber(0));

	playerStats.life = core.life;
	playerStats.shield = 0;
	playerStats.poison = 0;
	playerStats.regen = 0;
}

type ForceStats = {
	display: Phaser.GameObjects.Container | null;
	healthBar: Phaser.GameObjects.Graphics | null,
	shieldBar: Phaser.GameObjects.Graphics | null,
	life: number,
	shield: number,
	poison: number,
	regen: number,
}

export type ForceStatsState = {
	player: ForceStats,
	cpu: ForceStats
};
