import * as GameController from "@Core/GameController";

export async function ownedUnitSold(unitId: string) {

	await GameController.sellUnit(unitId);
}

