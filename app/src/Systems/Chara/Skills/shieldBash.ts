import { emit, signals } from "../../../Models/Signals";
import { Unit, unitLog } from "../../../Models/Unit";
import { bashPieceAnimation } from "../Animations/bashPieceAnimation";
import { popText } from "../Animations/popText";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import * as animation from "../Animations/shieldBash"
import { approach } from "../approach";
import { specialAnimation } from "../Animations/specialAnimation";
import { getJob } from "../../../Models/Job";

export async function shieldBash(
	scene: BattlegroundScene,
	unit: Unit,
) {
	const activeChara = scene.getChara(unit.id);
	const job = getJob(unit.job);

	if (!activeChara) { throw new Error("no active unit\n" + unit.id); }

	const candidates = await approach(activeChara, 1, true);

	if (!candidates) return false;

	// unit with higher maxhp
	const [target] = candidates.sort((a, b) => b.maxHp - a.maxHp);
	const targetChara = scene.getChara(target.id);

	await specialAnimation(activeChara);

	await popText(scene, "Shield Bash", unit.id);

	unitLog(unit, `will cast shield bash on ${target.id}`);

	bashPieceAnimation(activeChara, targetChara.container);

	await animation.shieldBash(activeChara, targetChara)

	emit(signals.DAMAGE_UNIT, targetChara.id, job.attack);

	if (targetChara.unit.hp > 0) {

		// TODO: make particle part of the chara
		// only "poison cloud" type particles should be bg-bound
		scene.createParticle(target.id, "stun")
		emit(signals.ADD_STATUS, targetChara.id, "stun", 1);
	}

	return true;

}
