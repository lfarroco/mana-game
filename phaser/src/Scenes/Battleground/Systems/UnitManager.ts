import { Unit } from "../../../Models/Unit";
import * as Chara from "../../../Systems/Chara/Chara";
import { vec2, Vec2, eqVec2 } from "../../../Models/Geometry";
import * as constants from "../constants";
import { summonEffect } from "../../../Effects/summonEffect";
import { tween } from "../../../Utils/animation";
import { BattlegroundScene } from "../BattlegroundScene";

let scene: BattlegroundScene;

type UnitManagerState = {
	charaIndex: Chara.Chara[]
}

export const unitManagerState: UnitManagerState = {
	charaIndex: [],
}

export function clearCharas() {
	unitManagerState.charaIndex.forEach(chara => {
		chara.container.destroy();
	});
	unitManagerState.charaIndex = [];
}

export function destroyChara(id: string) {
	const chara = unitManagerState.charaIndex.find(chara => chara.id === id);

	if (chara) {
		chara.container.destroy();
		unitManagerState.charaIndex = unitManagerState.charaIndex.filter(c => c.id !== id);
	}
}

export function init(sceneRef: BattlegroundScene) {
	scene = sceneRef;
}

export async function summonChara(unit: Unit, useSummonEffect = true, fadeIn = true) {

	const vec = getCharaPosition(unit);

	if (useSummonEffect) summonEffect(scene, vec);

	const chara = Chara.createCard(unit)

	Chara.addBoardEvents(chara);

	Chara.addTooltip(chara);

	chara.container.setAlpha(0);

	addCharaToState(chara);

	if (fadeIn)
		tween({
			targets: [chara.container],
			alpha: 1,
		});
	else
		chara.container.setAlpha(1);

	return chara
}

export function addCharaToState(chara: Chara.Chara) {
	unitManagerState.charaIndex.push(chara);
}

export function getCharaPosition(unit: Unit) {
	return vec2(
		unit.position.x * constants.TILE_WIDTH + constants.HALF_TILE_WIDTH,
		unit.position.y * constants.TILE_HEIGHT + constants.HALF_TILE_HEIGHT
	);
}

export function getChara(id: string) {
	return unitManagerState.charaIndex.find((chara) => chara.id === id)!;
}

export function getCPUCharas() {
	return unitManagerState.charaIndex.filter((chara) => chara.unit.force === constants.FORCE_ID_CPU)
}

export function getAllCharas() {
	return unitManagerState.charaIndex.filter((chara) => chara.unit.hp > 0)
}

export function getCharaAt(vec: Vec2) {
	return unitManagerState.charaIndex
		.filter(chara => chara.unit.hp > 0)
		.find((chara) => eqVec2(chara.unit.position, vec));
}

export function createParticle(id: string, status: string) {

	const chara = getChara(id);

	const alreadyExists = chara.container.getByName("status-" + status);
	if (alreadyExists) {
		alreadyExists.destroy();
	}

	const particles = scene.add.particles(
		0, 0,
		'white-dot',
		{
			speed: 10,
			lifespan: 700,
			scale: { start: 1, end: 0 },
			alpha: { start: 1, end: 0 },
			quantity: 1,
			frequency: 100,
			emitZone: {
				type: 'edge',
				source: new Phaser.Geom.Circle(0, 0, 20),
				quantity: 10,
				yoyo: false
			}
		}).setName("status-" + status);
	chara.container.add(particles);
}

// return any chara that contains the vec
export const overlap = (vec: { x: number, y: number }) => {
	return unitManagerState.charaIndex.find(chara => {
		return Phaser.Geom.Intersects.RectangleToRectangle(
			new Phaser.Geom.Rectangle(
				chara.container.x - constants.HALF_TILE_WIDTH,
				chara.container.y - constants.HALF_TILE_HEIGHT,
				constants.TILE_WIDTH,
				constants.TILE_HEIGHT
			),
			new Phaser.Geom.Rectangle(vec.x, vec.y, 1, 1)
		)
	})
}

// TODO: move this to the unit model?
export const getSurroundingAllies = (unit: Unit) => {
	return unitManagerState.charaIndex
		.filter(chara => chara.unit.hp > 0)
		.filter(chara => chara.unit.force === unit.force)
		.filter(chara => chara.id !== unit.id)
		.filter(chara => {
			const distance = Phaser.Math.Distance.BetweenPoints(
				unit.position,
				chara.unit.position
			);
			return distance === 1;
		});
}