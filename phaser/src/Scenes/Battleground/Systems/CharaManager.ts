import { Unit } from "../../../Models/Entities/Unit";
import * as Chara from "../../../Systems/Chara/Chara";
import { summonEffect } from "../../../Effects/summonEffect";
import { tween } from "../../../Utils/animation";
import { scene } from "../BattlegroundScene";
import { getCharaPosition } from "../../../Systems/Chara/Chara";

// Registry is now owned by Chara; this module delegates to Chara for queries

export function clearCharas() {
	Chara.getAllCharas().forEach(chara => {
		destroyChara(Chara.getId(chara));
	});
}

export function destroyChara(id: string) {
	try {
		const charaInstance = Chara.getCharaById(id);
		Chara.destroy(charaInstance);
	} catch { /* already gone */ }
}
export async function summonChara(
	unit: Unit,
	useSummonEffect = true,
) {
	const vec = getCharaPosition(unit);

	if (useSummonEffect) {
		summonEffect(scene, vec);
	}

	const chara = Chara.create(unit);

	Chara.setBarsVisibility(chara, false);
	chara.setScale(0);
	chara.setAngle(-10);
	await tween({
		targets: [chara],
		scale: 1,
		angle: 0,
		ease: "Back.easeOut",
		duration: 500,
	});
	Chara.setBarsVisibility(chara, true);

	return chara;
}

// registerChara removed: Chara.create() handles registration.

// positioning now provided by Chara.getCharaPosition

export function getChara(id: string) {
	return Chara.getCharaById(id);
}

export function getAllCharas() {
	return Chara.getAllCharas();
}

export const getSurroundingAllies = (unit: Unit) => {
	return Chara.getAllCharas()
		.filter(chara => Chara.getUnit(chara).force === unit.force)
		.filter(chara => Chara.getId(chara) !== unit.id)
		.filter(chara => {
			const distance = Phaser.Math.Distance.BetweenPoints(
				unit.position,
				Chara.getUnit(chara).position
			);
			return distance === 1;
		});
}

export function handleSummonCharaToBoardEvent(payload: { unit: Unit, animateAppear: boolean, playSound: boolean }): void {
	summonChara(payload.unit, payload.animateAppear);
}

export function handleCharaChargeBarUpdateEvent(payload: { unitId: string }): void {
	const chara = getChara(payload.unitId);
	Chara.updateChargeBar(chara);
}

export function handleCharaBarsVisibilitySetEvent(payload: { unitId: string, visible: boolean }): void {
	const chara = getChara(payload.unitId);
	Chara.setBarsVisibility(chara, payload.visible);
}