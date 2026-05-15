import Phaser from "phaser";
import { Unit, upgradeUnitData } from "@Models/Entities/Unit";
import * as constants from "@Constants/constants";
import { tween } from "@Utils/animation";
import * as PowerDisplay from "@Systems/Chara/PowerDisplay";
import * as ChargeBarDisplay from "@Systems/Chara/ChargeBarDisplay";
import * as RankDisplay from "@Systems/Chara/RankDisplay";
import * as input from "@Systems/Chara/input";
import * as CharaTooltip from "@Systems/Chara/CharaTooltip";
import { summonEffect } from "@Effects/summonEffect";
import { getCurrentScene, getState } from "@Models/State";

export type Chara = Container;

type CharaState = {
	unit: Unit;
	id: string;
	isAnimating: boolean;
	sprite: Phaser.GameObjects.Sprite;
};

const charaState = new WeakMap<Chara, CharaState>();

const charaById = new Map<string, Chara>();

const CORE_FLOAT_MIN_OFFSET_Y = -10;
const CORE_FLOAT_RANDOM_OFFSET_RANGE_Y = -20;
const CORE_FLOAT_MIN_DURATION_MS = 1000;
const CORE_FLOAT_RANDOM_DURATION_RANGE_MS = 1000;
const SUMMON_ANIMATION_DURATION_MS = 500;

// Shake animation effects
const SHAKE_OFFSET_X = 10;
const SHAKE_RANGE_X = 20;
const SHAKE_DURATION_MS = 100;
const SHAKE_REPEAT_COUNT = 3;

export function getCharaById(id: string): Chara {
	const c = charaById.get(id);
	if (!c) throw new Error(`Chara with id ${id} not found`);
	return c;
}

export function getAllCharas(): Chara[] {
	return Array.from(charaById.values());
}

export function hasCharaById(id: string): boolean {
	return charaById.has(id);
}

export async function summon(unit: Unit, useSummonEffect: boolean = true): Promise<Chara> {
	const vec = getScreenPosition(unit);
	if (useSummonEffect) {
		summonEffect(getCurrentScene(), vec);
	}
	const chara = await create(unit);
	enableTooltip(chara);
	chara.setScale(0);
	chara.setAngle(-10);
	await tween({
		targets: [chara],
		scale: 1,
		angle: 0,
		ease: "Back.easeOut",
		duration: SUMMON_ANIMATION_DURATION_MS,
	});
	return chara;
}

export function clearAll(): void {
	getAllCharas().forEach((c) => destroy(c));
}

export async function create(unit: Unit): Promise<Chara> {
	const position = getScreenPosition(unit);
	const container = getCurrentScene().add.container(position.x, position.y);

	const sprite = await createSprite(container, unit);
	if (unit.force === constants.FORCE_ID_CPU) {
		sprite.setFlipX(true);
	}

	container.setInteractive(
		new Phaser.Geom.Rectangle(
			-constants.HALF_TILE_WIDTH,
			-constants.HALF_TILE_HEIGHT,
			constants.TILE_WIDTH,
			constants.TILE_HEIGHT
		),
		Phaser.Geom.Rectangle.Contains
	);

	const state: CharaState = {
		unit,
		id: unit.id,
		isAnimating: false,
		sprite,
	};

	charaState.set(container, state);

	RankDisplay.create(unit, container);
	container.moveUp(sprite);

	input.init(container);

	charaById.set(unit.id, container);

	ChargeBarDisplay.create(unit, container);

	PowerDisplay.create(unit, container);

	return container;
}

export function enableTooltip(chara: Chara) {
	chara.on(Phaser.Input.Events.POINTER_OVER, () => {
		CharaTooltip.onCharaPointerOver(chara);
	});
	chara.on(Phaser.Input.Events.POINTER_OUT, () => {
		CharaTooltip.onCharaPointerOut();
	});
}

export function getScreenPosition(unit: Unit) {
	const slotSpacing = 8;
	const offsetX =
		unit.force === constants.FORCE_ID_PLAYER ? constants.PLAYER_BOARD_X : constants.CPU_BOARD_X;
	const offsetY =
		unit.force === constants.FORCE_ID_PLAYER ? constants.PLAYER_BOARD_Y : constants.CPU_BOARD_Y;

	let visualX = unit.position.x;
	if (unit.force === constants.FORCE_ID_CPU) {
		visualX = 2 - unit.position.x;
	}

	return {
		x: visualX * (constants.TILE_WIDTH + slotSpacing) + constants.HALF_TILE_WIDTH + offsetX,
		y:
			unit.position.y * (constants.TILE_HEIGHT + slotSpacing) +
			constants.HALF_TILE_HEIGHT +
			offsetY,
	};
}

async function createSprite(
	container: Chara,
	unit: Unit,
	_borderWidth: number = 3,
	_borderColor: number = 0xffffff
) {
	const sprite = getCurrentScene().add.sprite(0, -30, unit.pic);
	container.add(sprite);
	configureSprite(sprite, unit);

	return sprite;
}

function configureSprite(sprite: Phaser.GameObjects.Sprite, unit: Unit) {
	const animCacheKey = unit.pic + "-anims";
	const animData = getCurrentScene().cache.json.get(animCacheKey);

	if (animData && animData.anims) {
		for (const anim of animData.anims) {
			const animKey = unit.pic + "_" + anim.key;
			if (!getCurrentScene().anims.exists(animKey)) {
				const animConfig = {
					...anim,
					key: animKey,
					frames: (anim.frames as { frame: string }[]).map((f: { frame: string }) => ({
						key: unit.pic,
						frame: f.frame,
					})),
				};
				getCurrentScene().anims.create(animConfig);
			}
		}
	}

	const frameNames = getCurrentScene().textures.get(unit.pic).getFrameNames();
	const idleFrames = frameNames.filter((name) => name.startsWith(unit.pic + "_idle_"));
	idleFrames.sort((a, b) => {
		const numA = parseInt(a.match(/_(\d+)\.png$/)?.[1] || "0", 10);
		const numB = parseInt(b.match(/_(\d+)\.png$/)?.[1] || "0", 10);
		return numA - numB;
	});
	const firstIdle = idleFrames[0] || frameNames[0];

	sprite.setTexture(unit.pic, firstIdle);
	sprite.setDisplaySize(constants.TILE_WIDTH * 1.2, constants.TILE_HEIGHT * 1.2);

	if (getCurrentScene().anims.exists(unit.pic + "_idle")) {
		sprite.play(unit.pic + "_idle");
	}

	if (unit.isCore) {
		sprite.setDisplaySize(constants.TILE_WIDTH * 0.8, constants.TILE_HEIGHT * 0.8);
		tween({
			targets: [sprite],
			y: Math.random() * CORE_FLOAT_RANDOM_OFFSET_RANGE_Y + CORE_FLOAT_MIN_OFFSET_Y,
			ease: "Cubic.EaseOut",
			duration: Math.random() * CORE_FLOAT_RANDOM_DURATION_RANGE_MS + CORE_FLOAT_MIN_DURATION_MS,
			yoyo: true,
			repeat: -1,
		});
	}
}

export function isShopItem(id: string): boolean {
	return !getState().session.team.units.find((u) => u.id === id);
}

export function getUnit(chara: Chara): Unit {
	return mustGetState(chara).unit;
}

export function getId(chara: Chara): string {
	return mustGetState(chara).id;
}

export function destroy(chara: Chara) {
	chara.destroy();
	charaById.delete(getId(chara));
}

export function mustGetState(chara: Chara): CharaState {
	const s = charaState.get(chara);
	if (!s) throw new Error("Chara state not found for container");
	return s;
}

export function shake(chara: Chara) {
	const state = mustGetState(chara);
	if (state.isAnimating) return;
	state.isAnimating = true;

	const startingX = state.sprite.x;
	state.sprite.x += SHAKE_OFFSET_X;

	tween({
		targets: [state.sprite],
		x: state.sprite.x - SHAKE_RANGE_X,
		duration: SHAKE_DURATION_MS,
		repeat: SHAKE_REPEAT_COUNT,
		onComplete: () => {
			state.isAnimating = false;
			state.sprite.x = startingX;
		},
	});
}

export async function upgradeUnit(unit: Unit) {
	const chara = getCharaById(unit.id);

	upgradeUnitData(unit);

	chara.destroy();
	summon(unit, true);
}
