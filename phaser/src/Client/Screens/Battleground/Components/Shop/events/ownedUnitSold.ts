import * as Chara from "@Systems/Chara/Chara";
import * as DiscardZone from "@Screens/Battleground/Components/Shop/DiscardZone";
import * as GameController from "@Core/GameController";

export async function ownedUnitSold(unitId: string) {

	await GameController.sellUnit(unitId);

	const chara = Chara.mustGetCharaById(unitId);
	chara?.destroy();
	DiscardZone.hide();
}

