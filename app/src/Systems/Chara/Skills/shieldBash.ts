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

	const mtarget = await approach(activeChara, 1, true);

	if (!mtarget) return false;

	const targetChara = scene.getChara(mtarget.id);

	await specialAnimation(activeChara);
	if (mtarget.hp > 0) {
	}

	await popText(scene, "Shield Bash", unit.id);

	unitLog(unit, `will cast shield bash on ${mtarget.id}`);

	bashPieceAnimation(activeChara, targetChara.container);

	await animation.shieldBash(activeChara, targetChara)

	emit(
		signals.DAMAGE_UNIT,
		targetChara.id,
		job.attack
	);

	if (targetChara.unit.hp > 0) {

		scene.createParticle(mtarget.id, "stun")
		emit(
			signals.ADD_STATUS,
			targetChara.id,
			"stun",
			1
		);
	}

	return true;

}
