import { unitLog } from "../../../Models/Unit";
import { bashPieceAnimation } from "../Animations/bashPieceAnimation";
import { popText } from "../Animations/popText";
import * as animation from "../Animations/shieldBash"
import { approach } from "../approach";
import { specialAnimation } from "../Animations/specialAnimation";
import * as UnitManager from "../../../Scenes/Battleground/Systems/UnitManager";
import { Chara, damageUnit } from "../Chara";


// TODO: skill not being used anymore
// need to reimplment stun status and effect
export async function shieldBash(activeChara: Chara) {

	const { unit } = activeChara;

	const target = await approach(activeChara);

	// unit with higher maxhp
	const targetChara = UnitManager.getChara(target.id);

	await specialAnimation(activeChara);

	await popText({ text: "Shield Bash", targetId: unit.id });

	unitLog(unit, `will cast shield bash on ${target.id}`);

	bashPieceAnimation(activeChara, targetChara.container);

	await animation.shieldBash(activeChara, targetChara)

	await damageUnit(targetChara.id, unit.attack);

	return true;

}
