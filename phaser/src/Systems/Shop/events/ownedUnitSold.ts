import { Unit } from "@Models/Entities/Unit";
import { getState } from "@Models/State";
import { getCharaById } from "@Systems/Chara/Chara";
import * as DiscardZone from "../DiscardZone";
import { getGameController } from "@Core/GameControllerFactory";

export function ownedUnitSold(unitId: string) {
	const state = getState();

	// Use the GameController to handle the unit sale
	const controller = getGameController();
	controller.sellUnit(unitId);

	const chara = getCharaById(unitId);

	chara?.destroy();

	DiscardZone.hide();

	state.session.team.units = removeUnitFromPlayerState(state.session.team.units, unitId);
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
