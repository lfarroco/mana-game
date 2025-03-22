import { Unit } from "../../../Models/Unit";
import { Chara, createChara } from "../../../Systems/Chara/Chara";
import { vec2, Vec2, eqVec2 } from "../../../Models/Geometry";
import * as constants from "../constants";
import { summonEffect } from "../../../Effects/summonEffect";
import { emit, signals } from "../../../Models/Signals";
import { tween } from "../../../Utils/animation";
import { BattlegroundScene } from "../BattlegroundScene";

let scene: BattlegroundScene;
export let charas: Chara[] = [];

export function clearCharas() {
	charas.forEach((chara) => {
		chara.container.destroy();
	});
	charas.length = 0; // update in place
}

export function init(sceneRef: BattlegroundScene) {
	scene = sceneRef;
}

export async function renderUnit(unit: Unit) {

	const vec = vec2(
		unit.position.x * constants.TILE_WIDTH + constants.HALF_TILE_WIDTH,
		unit.position.y * constants.TILE_HEIGHT + constants.HALF_TILE_HEIGHT,
	);

	summonEffect(scene, scene.speed, vec);

	const chara = createChara(unit)

	chara.container.setAlpha(0);

	charas.push(chara)

	emit(signals.CHARA_CREATED, unit.id)

	tween({
		targets: [chara.container],
		alpha: 1,
		duration: 500 / scene.speed,
		ease: 'Power2',
	})
}

export function getChara(id: string) {
	return charas.find((chara) => chara.id === id)!;
}

export function getCharaAt(vec: Vec2) {
	return charas
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