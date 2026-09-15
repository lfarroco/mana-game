/**
 * Shared demo primitives for the interactive tutorial slides.
 *
 * A "demo" is a small board scene: a few units summoned with their real
 * sprites, optional looping FX between them, and the pop text that makes the
 * numbers legible. The interactive slides (sandbox / drag-drop / inspector)
 * reuse the same summon + FX machinery so the tutorial never invents a visual
 * the real game does not have.
 */

import * as Card from "@game/Entities/Card";
import * as Chara from "@Components/Chara/Chara";
import type { Chara as CharaType } from "@Components/Chara/Chara";
import * as Animations from "@Components/Chara/Animations";
import * as Constants from "@Constants";
import { env } from "@Env";
import * as damageFx from "@Screens/Battleground/Phases/Combat/logHandlers/visuals/damage";
import * as shieldFx from "@Screens/Battleground/Phases/Combat/logHandlers/visuals/shield";
import * as healFx from "@Screens/Battleground/Phases/Combat/logHandlers/visuals/heal";
import * as poisonFx from "@Screens/Battleground/Phases/Combat/logHandlers/visuals/poison";
import * as regenFx from "@Screens/Battleground/Phases/Combat/logHandlers/visuals/regen";
import type {
	TutorialDemoUnit,
	TutorialFxKind,
	TutorialPopText,
} from "@game/content/tutorialSlides";

export type Fx = (source: Vec2, target: Vec2, onHit: () => void) => void;

/** The real combat FX, reused so a tutorial demo looks like a real fight. */
export const FX: Record<TutorialFxKind, Fx> = {
	damage: damageFx.damageFx,
	shield: shieldFx.shieldFx,
	heal: healFx.healFx,
	poison: poisonFx.poisonFx,
	regen: regenFx.regenFx,
};

/**
 * Summon the demo units without the summon beam (the tutorial shows many boards
 * in a row — the ~700ms beam per unit would dominate the slide).
 *
 * A unit with an explicit `screen` position is moved there after summoning, so
 * slide layouts can reserve screen regions (palette, readout) and be certain no
 * unit lands on top of them.
 */
export const summonDemoUnits = async (units: readonly TutorialDemoUnit[]): Promise<CharaType[]> => {
	const unitModels = units.map((u) => Card.makeUnit(u.force, u.cardId, u.position ?? [0, 0]));
	const charas = await Promise.all(unitModels.map((u) => Chara.summon(u, false)));
	charas.forEach((chara, index) => {
		const screen = units[index].screen;
		if (screen) chara.setPosition(screen[0], screen[1]);
	});
	return charas;
};

/** Resolve a pop spec to its literal text using the chara's real unit stats. */
export const popTextValue = (caster: CharaType, pop: TutorialPopText): string => {
	const unit = Chara.getUnit(caster);
	const value =
		typeof pop.value === "number"
			? pop.value
			: pop.value === "power"
				? unit.power
				: Math.floor(unit.power / 10);
	return `${pop.sign}${value}`;
};

/** Play a pop over a chara at its real screen position. */
export const popOver = (chara: CharaType, text: string, kind: TutorialPopText["kind"]): void => {
	Animations.popText({ x: chara.x, y: chara.y, text, type: kind });
};

/**
 * A subtle board frame behind a demo, so units read as "standing on a board"
 * rather than floating on the title screen. The tutorial's authored unit
 * positions map onto the real board cells, so this frames exactly where they
 * land.
 */
export const createBoardFrame = (
	board: "player" | "enemy" = "player",
	alpha = 0.18
): Phaser.GameObjects.Graphics => {
	const columns = 3;
	const rows = 3;
	const gap = 8;
	const width = columns * Constants.TILE_WIDTH + (columns - 1) * gap;
	const height = rows * Constants.TILE_HEIGHT + (rows - 1) * gap;
	const x = board === "player" ? Constants.PLAYER_BOARD_X : Constants.CPU_BOARD_X;
	const y = board === "player" ? Constants.PLAYER_BOARD_Y : Constants.CPU_BOARD_Y;

	const graphics = env.scene.add.graphics();
	graphics.fillStyle(0xffffff, alpha * 0.25);
	graphics.lineStyle(2, 0xffffff, alpha);
	graphics.fillRoundedRect(x, y, width, height, 16);
	graphics.strokeRoundedRect(x, y, width, height, 16);

	// Cell separators — three columns, three rows.
	graphics.lineStyle(1, 0xffffff, alpha * 0.5);
	for (let column = 1; column < columns; column++) {
		const lineX = x + column * (Constants.TILE_WIDTH + gap) - gap / 2;
		graphics.lineBetween(lineX, y + 6, lineX, y + height - 6);
	}
	for (let row = 1; row < rows; row++) {
		const lineY = y + row * (Constants.TILE_HEIGHT + gap) - gap / 2;
		graphics.lineBetween(x + 6, lineY, x + width - 6, lineY);
	}

	return graphics;
};

/** A dim card panel used by the sandbox readout and the inspector. */
export const createPanel = (
	x: number,
	y: number,
	width: number,
	height: number,
	radius = 16
): Phaser.GameObjects.Graphics => {
	const graphics = env.scene.add.graphics();
	graphics.fillStyle(0x000000, 0.45);
	graphics.lineStyle(2, 0xffffff, 0.35);
	graphics.fillRoundedRect(x, y, width, height, radius);
	graphics.strokeRoundedRect(x, y, width, height, radius);
	return graphics;
};
