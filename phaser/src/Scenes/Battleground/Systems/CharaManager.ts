import { Unit } from "../../../Models/Unit";
import * as Chara from "../../../Systems/Chara/Chara";
import { vec2, Vec2, eqVec2 } from "../../../Models/Geometry";
import { summonEffect } from "../../../Effects/summonEffect";
import { tween } from "../../../Utils/animation";
import { BattlegroundScene } from "../BattlegroundScene";
import { images } from "../../../assets";
import * as constants from "../constants";

let scene: BattlegroundScene;

type CharaManagerState = {
	charaIndex: Chara.Chara[]
}

export function init(sceneRef: BattlegroundScene) {
	scene = sceneRef;
}

export const charaManagerState: CharaManagerState = {
	charaIndex: [],
}

//@ts-ignore
window.charas = charaManagerState;

export function clearCharas() {
	charaManagerState.charaIndex.forEach(chara => {
		destroyChara(chara.id)
	});
	charaManagerState.charaIndex = [];
}

export function destroyChara(id: string) {
	const chara = charaManagerState.charaIndex.find(chara => chara.id === id);

	if (chara) {
		chara.destroy();
		charaManagerState.charaIndex = charaManagerState.charaIndex.filter(c => c.id !== id);
	} else {
		console.warn(`Chara with id ${id} not found`);
	}
}
export async function summonChara(
	unit: Unit,
	useSummonEffect = true,
	fadeIn = true,
) {
	const vec = getCharaPosition(unit);

	if (useSummonEffect) summonEffect(scene, vec);

	const chara = new Chara.Chara(scene, unit)

	//Chara.addBoardEvents();

	chara.addTooltip();

	chara.setAlpha(0);

	if (fadeIn)
		tween({
			targets: [chara],
			alpha: 1,
		});
	else
		chara.setAlpha(1);

	return chara
}

export function addCharaToState(chara: Chara.Chara) {
	charaManagerState.charaIndex.push(chara);
}

export function getCharaPosition(unit: Unit) {

	const offsetX = unit.force === constants.FORCE_ID_PLAYER ? constants.PLAYER_BOARD_X : constants.CPU_BOARD_X;
	const offsetY = unit.force === constants.FORCE_ID_PLAYER ? constants.PLAYER_BOARD_Y : constants.CPU_BOARD_Y;

	return vec2(
		unit.position.x * constants.TILE_WIDTH + constants.HALF_TILE_WIDTH + offsetX,
		unit.position.y * constants.TILE_HEIGHT + constants.HALF_TILE_HEIGHT + offsetY
	);
}

export function getChara(id: string) {
	return charaManagerState.charaIndex.find((chara) => chara.id === id)!;
}

export function getCPUCharas() {
	return charaManagerState.charaIndex.filter((chara) => chara.unit.force === constants.FORCE_ID_CPU)
}

export function getAllCharas() {
	return charaManagerState.charaIndex.filter((chara) => chara.unit.hp > 0)
}

export function getCharaAt(vec: Vec2) {
	return charaManagerState.charaIndex
		.filter(chara => chara.unit.hp > 0)
		.find((chara) => eqVec2(chara.unit.position, vec));
}

export function createParticle(id: string, status: string) {

	const chara = getChara(id);

	const alreadyExists = chara.getByName("status-" + status);
	if (alreadyExists) {
		alreadyExists.destroy();
	}

	const particles = scene.add.particles(
		0, 0,
		images.white_dot.key,
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
	chara.add(particles);
}

// return any chara that contains the vec
export const overlap = (vec: { x: number, y: number }) => {
	return charaManagerState.charaIndex.find(chara => {
		return Phaser.Geom.Intersects.RectangleToRectangle(
			new Phaser.Geom.Rectangle(
				chara.x - constants.HALF_TILE_WIDTH,
				chara.y - constants.HALF_TILE_HEIGHT,
				constants.TILE_WIDTH,
				constants.TILE_HEIGHT
			),
			new Phaser.Geom.Rectangle(vec.x, vec.y, 1, 1)
		)
	})
}

// TODO: move this to the unit model?
export const getSurroundingAllies = (unit: Unit) => {
	return charaManagerState.charaIndex
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