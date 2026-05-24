import * as Chara from "@Systems/Chara/Chara";
import * as DiscardZone from "@Systems/Shop/DiscardZone";
import * as GameController from "@Core/GameController";

export async function ownedUnitSold(unitId: string) {

	await GameController.sellUnit(unitId);

	state.session.team.units =
		state
			.session
			.team
			.units
			.filter((u) => u.id !== unitId);

	const chara = Chara.getCharaById(unitId);
	chara?.destroy();
	DiscardZone.hide();
}

