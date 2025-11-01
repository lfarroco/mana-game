import Phaser from "phaser";
import { Unit } from "@Models/Entities/Unit";
import * as constants from "@Constants/constants";
import { tween } from "@Utils/animation";
import { scene } from "@Scenes/Battleground/BattlegroundScene";
import * as CharaStatsDisplay from "./CharaStatsDisplay";
import * as ChargeBarDisplay from "./ChargeBarDisplay";
import * as input from "./input";
import * as CharaTooltip from "./CharaTooltip";
import { popText } from "./Animations/popText";
import { summonEffect } from "../../Effects/summonEffect";
import { getState } from "@Models/State";

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

export async function summon(
	unit: Unit,
	useSummonEffect: boolean = true,
): Promise<Chara> {
	const vec = getScreenPosition(unit);
	if (useSummonEffect) {
		summonEffect(scene, vec);
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
	getAllCharas().forEach(c => destroy(c));
}

export function create(unit: Unit): Chara {
	const position = getScreenPosition(unit);
	const container = scene.add.container(position.x, position.y);

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

	input.init(container);

	charaById.set(unit.id, container);

	container.on(Phaser.Input.Events.POINTER_OVER, () => {
		if (isShopItem(unit.id)) {
			return;
		}
		CharaTooltip.onCharaPointerOver(container);
	});
	container.on(Phaser.Input.Events.POINTER_OUT, () => {
		if (isShopItem(unit.id)) {
			return;
		}
		CharaTooltip.onCharaPointerOut();
	});

	ChargeBarDisplay.create(unit, container);
	CharaStatsDisplay.create(unit, container);

	return container;
}

export function getScreenPosition(unit: Unit) {
	const slotSpacing = 8;
	const offsetX = unit.force === constants.FORCE_ID_PLAYER ? constants.PLAYER_BOARD_X : constants.CPU_BOARD_X;
	const offsetY = unit.force === constants.FORCE_ID_PLAYER ? constants.PLAYER_BOARD_Y : constants.CPU_BOARD_Y;

	let visualX = unit.position.x;
	if (unit.force === constants.FORCE_ID_CPU) {
		visualX = 2 - unit.position.x;
	}

	return {
		x: visualX * (constants.TILE_WIDTH + slotSpacing) + constants.HALF_TILE_WIDTH + offsetX,
		y: unit.position.y * (constants.TILE_HEIGHT + slotSpacing) + constants.HALF_TILE_HEIGHT + offsetY,
	};
}

function createSprite(container: Chara, unit: Unit, _borderWidth: number = 3, _borderColor: number = 0xffffff) {
	const animCacheKey = unit.pic + '-anims';
	const animData = scene.cache.json.get(animCacheKey);

	if (animData && animData.anims) {
		for (const anim of animData.anims) {
			const animKey = unit.pic + '_' + anim.key;
			if (!scene.anims.exists(animKey)) {
				const animConfig = {
					...anim,
					key: animKey,
					frames: (anim.frames as { frame: string }[])
						.map((f: { frame: string }) => ({ key: unit.pic, frame: f.frame })),
				};
				scene.anims.create(animConfig);
			}
		}
	}

	const frameNames = scene.textures.get(unit.pic).getFrameNames();
	const idleFrames = frameNames.filter(name => name.startsWith(unit.pic + '_idle_'));
	idleFrames.sort((a, b) => {
		const numA = parseInt(a.match(/_(\d+)\.png$/)?.[1] || '0', 10);
		const numB = parseInt(b.match(/_(\d+)\.png$/)?.[1] || '0', 10);
		return numA - numB;
	});
	const firstIdle = idleFrames[0] || frameNames[0];

	const sprite = scene.add.sprite(0, -15, unit.pic, firstIdle);
	sprite.setDisplaySize(constants.TILE_WIDTH * 1.2, constants.TILE_HEIGHT * 1.2);
	container.add(sprite);
	if (scene.anims.exists(unit.pic + '_idle')) {
		sprite.play(unit.pic + '_idle');
	}

	if (unit.isCore) {

		sprite.setDisplaySize(constants.TILE_WIDTH * 0.8, constants.TILE_HEIGHT * 0.8);
		tween({
			targets: [sprite],
			y: Math.random() * -20 - 10,
			ease: "Cubic.EaseOut",
			duration: Math.random() * 1000 + 1000,
			yoyo: true,
			repeat: -1
		})
	}

	return sprite;
}

export function isShopItem(id: string): boolean {
	return !getState().gameData.player.units.find(u => u.id === id);
}

export function getUnit(chara: Chara): Unit {
	return mustGetState(chara).unit;
}

export function getId(chara: Chara): string {
	return mustGetState(chara).id;
}

export function updateUnitPower(chara: Chara, num: number) {
	const s = mustGetState(chara);
	const { unit } = s;
	const positive = num >= 0;
	const text = `${positive ? "+" : "-"}${num}`;

	unit.power += num;

	CharaStatsDisplay.animatePowerChange(s.id, unit.power);

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

	const startingX = chara.x;
	chara.x += 10;

	tween({
		targets: [chara],
		x: chara.x - 20,
		alpha: 0.3,
		duration: 100,
		repeat: 3,
		onComplete: () => {
			state.isAnimating = false;
			chara.x = startingX;
			chara.alpha = 1;
		}
	});
}