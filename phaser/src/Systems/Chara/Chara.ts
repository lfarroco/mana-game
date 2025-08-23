import Phaser from "phaser";
import { Unit } from "../../Models/Entities/Unit";
import * as constants from "../../constants/constants";
import { tween } from "../../Utils/animation";
import { scene } from "../../Scenes/Battleground/BattlegroundScene";
import * as CharaStatsDisplay from "./CharaStatsDisplay";
import * as CharaBarsDisplay from "./CharaBarsDisplay";
import * as CharaInputHandler from "./CharaInputHandler";
import { createContinuousHasteEffect } from "../../Effects/hasteEffect";
import { onCharaPointerOut, onCharaPointerOver } from "./CharaTooltip";
import { hideTooltip } from "../../UI/Tooltip";
import { Vec2 } from "../../Models/Geometry.pure";
import { playSoundEffect } from "../AudioManager";
import * as Shop from "../../Scenes/Battleground/Systems/Shop/Shop";
import * as ShopUI from "../../Scenes/Battleground/Systems/Shop/ShopUI";
import { popText } from "./Animations/popText";
import { summonEffect } from "../../Effects/summonEffect";
import { getState } from "../../Models/State";

export type Chara = Phaser.GameObjects.Container;

type HasteEffectState = { particles: Phaser.GameObjects.Particles.ParticleEmitter; cleanup: () => void };

type CharaState = {
	unit: Unit;
	id: string;
	isAnimating: boolean;
	sprite: Phaser.GameObjects.Sprite;
	hasteEffect?: HasteEffectState;
	previousHasteState: number;
};

const charaState = new WeakMap<Chara, CharaState>();

const charaById = new Map<string, Chara>();

export function getCharaById(id: string): Chara {
	const c = charaById.get(id);
	if (!c) throw new Error(`Chara with id ${id} not found.`);
	return c;
}

export function getAllCharas(): Chara[] {
	return Array.from(charaById.values());
}

export async function summon(unit: Unit, useSummonEffect: boolean = true): Promise<Chara> {
	const vec = getCharaPosition(unit);
	if (useSummonEffect) {
		summonEffect(scene, vec);
	}
	const chara = create(unit);
	CharaBarsDisplay.setVisible(unit.id, false);
	chara.setScale(0);
	chara.setAngle(-10);
	await tween({
		targets: [chara],
		scale: 1,
		angle: 0,
		ease: "Back.easeOut",
		duration: 500,
	});
	CharaBarsDisplay.setVisible(unit.id, true);
	return chara;
}

// Destroy all currently tracked charas
export function clearAll(): void {
	getAllCharas().forEach(c => destroy(c));
}

export function getSurroundingAllies(unit: Unit): Chara[] {
	return getAllCharas()
		.filter(ch => getUnit(ch).force === unit.force)
		.filter(ch => getId(ch) !== unit.id)
		.filter(ch => {
			const distance = Phaser.Math.Distance.BetweenPoints(
				unit.position,
				getUnit(ch).position
			);
			return distance === 1;
		});
}

export function summonToBoard(payload: { unit: Unit; animateAppear: boolean; playSound?: boolean }): void {
	void summon(payload.unit, payload.animateAppear);
}

export function create(unit: Unit): Chara {
	const position = getCharaPosition(unit);
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
		hasteEffect: undefined,
		previousHasteState: 0,
	};

	charaState.set(container, state);

	CharaInputHandler.create(container);

	// Register this chara instance for global lookup
	charaById.set(unit.id, container);

	container.on(Phaser.Input.Events.POINTER_OVER, () => {
		onCharaPointerOver({ chara: container });
	});
	container.on(Phaser.Input.Events.POINTER_OUT, () => {
		onCharaPointerOut();
	});

	CharaStatsDisplay.updatePower(unit.id);

	updateStatusEffects(container);

	return container;
}

// Returns the on-screen position for a unit's board coordinates and force.
export function getCharaPosition(unit: Unit) {
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
	} as Vec2;
}

function createSprite(container: Chara, unit: Unit, borderWidth: number = 3, borderColor: number = 0xffffff) {
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

	const radius = (constants.TILE_WIDTH * 0.8) / 2;
	const border = scene.add.graphics({ x: 0, y: 0 });
	border.lineStyle(borderWidth, borderColor, 1);
	border.strokeCircle(0, 0, radius);
	container.add(border);

	const sprite = scene.add.sprite(0, -15, unit.pic, firstIdle);
	sprite.setDisplaySize(constants.TILE_WIDTH * 1.2, constants.TILE_HEIGHT * 1.2);
	container.add(sprite);
	if (scene.anims.exists(unit.pic + '_idle')) {
		sprite.play(unit.pic + '_idle');
	}

	return sprite;
}

export function onShopPurchaseSuccesful(chara: Chara): void {
	hideTooltip();

	ShopUI.removeShopChild(chara);

	Shop.handleCharaPurchaseFinalized(chara);

	playSoundEffect('sfx_artifact_equipweapon');

	// Remove the shop item instance from display and registry
	destroy(chara);
}

export function onShopPurchaseFailed(chara: Chara, vec: Vec2) {
	hideTooltip();
	tween({
		targets: [chara],
		...vec,
		duration: 150,
	});
}

export function getIsShopItem(id: string): boolean {
	return !getState().gameData.player.units.find(u => u.id === id);
}

export function getUnit(chara: Chara): Unit {
	return mustGetState(chara).unit;
}

export function getId(chara: Chara): string {
	return mustGetState(chara).id;
}

export function updateUnit(chara: Chara, newUnit: Unit): void {
	const s = mustGetState(chara);
	s.unit = newUnit;

	CharaStatsDisplay.updateUnit(s.id, newUnit);

	CharaBarsDisplay.updateUnit(s.id, newUnit);
	updateStatusEffects(chara);
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

export function destroy(chara: Chara, fromScene?: boolean) {
	removeHasteEffect(chara);
	chara.off(Phaser.Input.Events.POINTER_OVER);
	chara.off(Phaser.Input.Events.POINTER_OUT);
	chara.destroy(fromScene);
	// De-register from global registry
	try {
		charaById.delete(getId(chara));
	} catch { /* ignore */ }
}

export function updateStatusEffects(chara: Chara): void {
	const s = mustGetState(chara);
	if (s.unit.hasted > 0 && s.previousHasteState === 0) {
		showHasteEffect(chara);
	} else if (s.unit.hasted === 0 && s.previousHasteState > 0) {
		removeHasteEffect(chara);
	}
	s.previousHasteState = s.unit.hasted;
}

function showHasteEffect(chara: Chara): void {
	const s = mustGetState(chara);
	if (s.hasteEffect) return;

	s.hasteEffect = createContinuousHasteEffect(
		scene,
		{ x: chara.x, y: chara.y },
		{
			intensity: 1.0,
			color: 0x00eaff
		}
	);

	chara.add(s.hasteEffect.particles);
	s.hasteEffect.particles.setPosition(0, 0);
}

function removeHasteEffect(chara: Chara): void {
	const s = charaState.get(chara);
	if (!s || !s.hasteEffect) return;
	s.hasteEffect.cleanup();
	s.hasteEffect = undefined;
}

export async function pop(id: string) {
	const chara = getCharaById(id);
	const s = mustGetState(chara);
	if (s.isAnimating) return;
	s.isAnimating = true;

	const attackAnimKey = `${s.unit.pic}_attack`;
	const idleAnimKey = `${s.unit.pic}_idle`;

	s.sprite.anims.play(attackAnimKey, true);
	s.sprite.playAfterRepeat(idleAnimKey);

	await tween({
		targets: [chara],
		scale: 1.2,
		yoyo: true,
		duration: 300,
		repeat: 0,
	});

	s.isAnimating = false;
}

function mustGetState(chara: Chara): CharaState {
	const s = charaState.get(chara);
	if (!s) throw new Error("Chara state not found for container");
	return s;
}
