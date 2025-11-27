import { Unit } from "@Models/Entities/Unit";
import { getState } from "@Models/State";
import { getCharaById } from "@Systems/Chara/Chara";
import * as DiscardZone from "../DiscardZone";

export function ownedUnitSold(unitId: string) {
	const state = getState();

	const chara = getCharaById(unitId);

	chara?.destroy();

	DiscardZone.hide();

	state.gameData.player.units = removeUnitFromPlayerState(state.gameData.player.units, unitId);
}

export function removeUnitFromPlayerState(units: Unit[], unitId: string): Unit[] {
	const unitIndex = units.findIndex((u) => u.id === unitId);
	if (unitIndex > -1) {
		return units.filter((u) => u.id !== unitId);
	} else {
		console.warn(`Unit with ID ${unitId} not found for discarding`);
		return [...units];
	}
}
