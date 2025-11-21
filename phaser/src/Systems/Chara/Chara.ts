import Phaser from "phaser";
import { Unit, upgradeUnitEffects, resetUnitEffectsToCardDefinition } from "@Models/Entities/Unit";
import * as constants from "@Constants/constants";
import { tween } from "@Utils/animation";
import * as PowerDisplay from "./PowerDisplay";
import * as ChargeBarDisplay from "./ChargeBarDisplay";
import * as RankDisplay from "./RankDisplay";
import * as input from "./input";
import * as CharaTooltip from "./CharaTooltip";
import { popText } from "./Animations/popText";
import { summonEffect } from "../../Effects/summonEffect";
import { getCurrentScene, getState } from "@Models/State";
import { getCardDefinition } from "@Models/Entities/Card";

export type Chara = Container;

type CharaState = {
	unit: Unit;
	id: string;
	isAnimating: boolean;
	sprite: Phaser.GameObjects.Sprite;
};

const charaState = new WeakMap<Chara, CharaState>();

const charaById = new Map<string, Chara>();

export function getCharaById(id: string): Chara {
	const c = charaById.get(id);
	if (!c) throw new Error(`Chara with id ${id} not found`);
	return c;
}

export function getAllCharas(): Chara[] {
	return Array.from(charaById.values());
}

export async function summon(unit: Unit, useSummonEffect: boolean = true): Promise<Chara> {
	const vec = getScreenPosition(unit);
	if (useSummonEffect) {
		summonEffect(getCurrentScene(), vec);
	}
	const chara = create(unit);
	chara.setScale(0);
	chara.setAngle(-10);
	await tween({
		targets: [chara],
		scale: 1,
		angle: 0,
		ease: "Back.easeOut",
		duration: 500,
	});
	return chara;
}

export function clearAll(): void {
	getAllCharas().forEach((c) => destroy(c));
}

export function create(unit: Unit): Chara {
	const position = getScreenPosition(unit);
	const container = getCurrentScene().add.container(position.x, position.y);

	const sprite = createSprite(container, unit);
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

	// TODO: use function to enable this even, this logic is too complex
	container.on(Phaser.Input.Events.POINTER_OVER, () => {
		if (unit.force === constants.FORCE_ID_PLAYER && isShopItem(unit.id)) {
			return;
		}
		CharaTooltip.onCharaPointerOver(container);
	});
	container.on(Phaser.Input.Events.POINTER_OUT, () => {
		if (unit.force === constants.FORCE_ID_PLAYER && isShopItem(unit.id)) {
			return;
		}
		CharaTooltip.onCharaPointerOut();
	});

	ChargeBarDisplay.create(unit, container);

	PowerDisplay.create(unit, container);

	return container;
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

function createSprite(
	container: Chara,
	unit: Unit,
	_borderWidth: number = 3,
	_borderColor: number = 0xffffff
) {
	const animCacheKey = unit.pic + "-anims";
	const animData = getCurrentScene().cache.json.get(animCacheKey);

	if (!animData && !unit.isCore) {
		const scene = getCurrentScene();
		scene.load.atlas(unit.pic, `assets/heroes/${unit.pic}.png`, `assets/heroes/${unit.pic}.json`);
		scene.load.animation(`${unit.pic}-anims`, `assets/heroes/${unit.pic}-anims.json`);

		const placeholder = scene.add.sprite(0, -15, "placeholder");
		placeholder.setVisible(false);
		container.add(placeholder);

		scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
			configureSprite(placeholder, unit);
			placeholder.setVisible(true);
		});

		scene.load.start();
		return placeholder;
	}

	const sprite = getCurrentScene().add.sprite(0, -15, unit.pic);
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
			y: Math.random() * -20 - 10,
			ease: "Cubic.EaseOut",
			duration: Math.random() * 1000 + 1000,
			yoyo: true,
			repeat: -1,
		});
	}

}

export function isShopItem(id: string): boolean {
	return !getState().gameData.player.units.find((u) => u.id === id);
}

export function getUnit(chara: Chara): Unit {
	return mustGetState(chara).unit;
}

export function getId(chara: Chara): string {
	return mustGetState(chara).id;
}

export function updateUnitPower(chara: Chara, num: number, permanent?: boolean) {
	const s = mustGetState(chara);
	const { unit } = s;
	const positive = num >= 0;
	const text = `${positive ? "+" : "-"}${num}`;

	unit.power += num;

	PowerDisplay.updatePowerDisplay(s.id);
	popText({
		x: chara.x,
		y: chara.y,
		text,
	});

	if (permanent && unit.force === constants.FORCE_ID_PLAYER) {
		const playerUnit = getState().gameData.player.units.find((u) => u.id === unit.id)!;
		playerUnit.power += num;
	}
}

export function updateUnitCritical(chara: Chara, num: number) {
	const s = mustGetState(chara);
	const { unit } = s;
	const positive = num >= 0;
	const text = `${positive ? "+" : "-"}${num} Crit`;

	if (!unit.critical) unit.critical = 0;

	unit.critical += num;

	popText({
		x: chara.x,
		y: chara.y,
		text,
	});
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
	state.sprite.x += 10;

	tween({
		targets: [state.sprite],
		x: state.sprite.x - 20,
		duration: 100,
		repeat: 3,
		onComplete: () => {
			state.isAnimating = false;
			state.sprite.x = startingX;
		},
	});
}

export async function upgrade(unit: Unit) {
	const chara = getCharaById(unit.id);

	const source = getCardDefinition(unit.cardId);


	unit.rank += 1;

	if (source.power)
		unit.power = source.power * unit.rank;

	resetUnitEffectsToCardDefinition(unit, source);
	upgradeUnitEffects(unit);

	chara.destroy();

	summon(unit, true);
}
