import { Unit } from "../../../Models/Entities/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { getRangedTargets } from "../../../Models/Board";
import * as animation from "../../../Effects/arcaneMissile";
import * as UnitManager from "../../../Scenes/Battleground/Systems/CharaManager";

export const arcaneMissiles = (
	scene: BattlegroundScene
) => async (unit: Unit, projectiles = 3) => {

	const { state } = scene;

	const targets = getRangedTargets(state, unit, 3);

	if (targets.length === 0) {
		console.warn("No enemies found");
		return;
	};

	const activeChara = UnitManager.getChara(unit.id);

	//pick 3 random indexes (can be repeated)
	for (let i = 1; i <= projectiles; i++) {

		const randomIndex = Math.floor(Math.random() * targets.length);

		const target = targets[randomIndex];

		const targetChara = UnitManager.getChara(target.id);

		if (!activeChara || !targetChara) return;

		animation.arcaneMissile(
			{
				scene,
				source: activeChara,
				target: targetChara,
				onHit: () => {
					if (targetChara.unit.hp <= 0 || !targetChara.active) return;
					//targetChara.unitHit(unit.power);
				}
			});

	}


}
