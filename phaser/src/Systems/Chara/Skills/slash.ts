import { getBattleUnit } from "../../../Models/State";
import { Unit } from "../../../Models/Unit";
import { bashPieceAnimation } from "../Animations/bashPieceAnimation";
import { popText } from "../Animations/popText";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { physicalAttack } from "./physicalAttack";
import { approach } from "../approach";
import * as UnitManager from "../../../Scenes/Battleground/Systems/UnitManager";
import { Chara } from "../Chara";

export async function slash(
	scene: BattlegroundScene,
	unit: Unit,
) {
	const activeChara = UnitManager.getChara(unit.id);

	const candidates = await approach(activeChara, 1, true);
	if (!candidates) return;

	// unit with higher maxhp
	const [target] = candidates.sort((a, b) => b.maxHp - a.maxHp);

	const targetUnit = getBattleUnit(scene.state)(target.id);
	const targetChara = UnitManager.getChara(targetUnit.id);

	await popText({ text: "Slash", targetId: unit.id });

	for (let i = 0; i < unit.multicast; i++) {

		if (targetChara.unit.hp <= 0) {
			return
		}

		await attack(scene, activeChara, targetChara);
	}
}


async function attack(_scene: BattlegroundScene, activeChara: Chara, targetChara: Chara) {

	// TODO: bash piece animation gets out of sync with the physical attack logic.
	// should make it accept the physical attack function as a callback
	// currently, one's tweens interferes with the other

	await bashPieceAnimation(activeChara, targetChara.container);

	await physicalAttack(activeChara, targetChara);
}
