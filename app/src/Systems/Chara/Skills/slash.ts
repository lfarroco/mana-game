import { getUnit } from "../../../Models/State";
import { Unit, unitLog } from "../../../Models/Unit";
import { bashPieceAnimation } from "../Animations/bashPieceAnimation";
import { popText } from "../Animations/popText";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { delay } from "../../../Utils/animation";
import { physicalAttack } from "./physicalAttack";
import { approach } from "../approach";

export async function slash(
	scene: BattlegroundScene,
	unit: Unit,
) {
	console.log("[skill] :: slash :: start", unit.job);
	const { speed } = scene;

	const activeChara = scene.getChara(unit.id);

	const candidates = await approach(activeChara, 1, true);
	if (!candidates) return;

	// unit with higher maxhp
	const [target] = candidates.sort((a, b) => b.maxHp - a.maxHp);

	const targetUnit = getUnit(scene.state)(target.id);
	const targetChara = scene.getChara(targetUnit.id);

	await popText(scene, "Slash", unit.id);

	unitLog(unit, `will cast slash on ${targetUnit.id}`);

	bashPieceAnimation(activeChara, targetChara.container);
	scene.playFx("audio/sword2");
	await delay(scene, 300 / speed);

	await physicalAttack(activeChara, targetChara);

	console.log("[skill] :: slash :: end", unit.job);
}

