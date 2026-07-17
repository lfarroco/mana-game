import * as Chip from "@Components/Chip/Chip";
import * as Tooltip from "@Components/Tooltip/Tooltip";
import * as Constants from "@Core/Constants";
import * as i18n from "@i18n/i18n";
import * as Card from "@Models/Entities/Card";
import * as Unit from "@Models/Entities/Unit";
import * as Animations from "@Systems/Chara/Animations";
import * as Utils from "@utils";
import * as Logger from "@Utils/Logger";

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

export function createForceStats() {
	[Constants.FORCE_ID_PLAYER, Constants.FORCE_ID_CPU].forEach(createStatsForForce)
}

const createStatsForForce = (force: string) => {
	const x = force === Constants.FORCE_ID_PLAYER ? 300 : 1200;
	const y = 1000;

	const stats = force === Constants.FORCE_ID_PLAYER ? statsState.player : statsState.cpu;

	const core = Card.getBattleCore(state)(force);

	const lifeDisplay = createLifeDisplay(force, x, y, core);

	const shieldDisplay = createShieldDisplay(force, x, y, core);

	const regenDisplay = createRegenDisplay(force, x, y);

	const poisonDisplay = createPoisonDisplay(force, x, y);

	const barWidth = 600;
	const barHeight = 20;
	const healthBarPos = [x + 225, y + 60] as Vec2;
	const shieldBarPos = [x + 225, y + 40] as Vec2;

	const { healthBar, bgBar } = createHealthBar(healthBarPos, barWidth, barHeight, x, y);

	const { shieldBar, bgShieldBar } = createShieldbar(shieldBarPos, barWidth, barHeight, x, y);

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

	stats.display?.destroy();
	stats.display = io.Container(elements);
	stats.display.setDepth(1000); // Ensure it's on top

	io.OnceDestroyed(stats.display, () => {
		stats.display = null;
		stats.healthBar = null;
		stats.shieldBar = null;
		stats.life = 0;
		stats.shield = 0;
		stats.regen = 0;
		stats.poison = 0;
	});

}

function createShieldbar(shieldBarPos: Vec2, barWidth: number, barHeight: number, x: number, y: number) {
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
	return { shieldBar, bgShieldBar };
}

function createHealthBar(healthBarPos: Vec2, barWidth: number, barHeight: number, x: number, y: number) {
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
	return { healthBar, bgBar };
}

function createPoisonDisplay(force: string, x: number, y: number) {
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
	return poisonDisplay;
}

function createRegenDisplay(force: string, x: number, y: number) {
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
	return regenDisplay;
}

function createShieldDisplay(force: string, x: number, y: number, core: Unit.Unit) {
	const shieldDisplayId = `shield-display/${force}`;
	const shieldDisplay = Chip.createChip(
		shieldDisplayId,
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
	Chip.updateChipText(shieldDisplayId, core.shield.toString());
	return shieldDisplay;
}

function createLifeDisplay(force: string, x: number, y: number, core: Unit.Unit) {
	const lifeDisplayId = `life-display/${force}`;

	const lifeDisplay = Chip.createChip(lifeDisplayId, [x, y], 0x29a1b9ff, "0", 100);
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
	const stats = getForceStats(force);

	const chipId = `life-display/${force}`;

	Chip.updateChipText(chipId, Utils.compactNumber(life));

	const bar = stats.healthBar;
	if (!bar) {
		Logger.error("ForceStats", `No health bar found for force ${force}`);
		return;
	}
	const core = Card.getBattleCore(state)(force);
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

	if (delta === 0) return;

	const chip = Chip.getChip(chipId);

	if (!chip) {
		Logger.error("ForceStats", "No chip found for id", chipId);
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
) {

	const chipId = `shield-display/${force}`;
	Chip.updateChipText(chipId, Utils.compactNumber(shield));

	const bar = getForceStats(force).shieldBar;

	if (!bar) {
		Logger.error("ForceStats", "No bar for force", force);
		return;
	}

	const core = Card.getBattleCore(state)(force);
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
		Logger.error("ForceStats", "No chip found for id", chipId);
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

// TODO: update these functions to have the target unit as arg, and locate the force from there.
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
