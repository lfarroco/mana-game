import { getBattleUnit } from "../../../Models/State";
import { Unit } from "../../../Models/Unit";
import { bashPieceAnimation } from "../Animations/bashPieceAnimation";
import { popText } from "../Animations/popText";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { physicalAttack } from "./physicalAttack";
import { approach as getMeleeTarget } from "../approach";
import * as UnitManager from "../../../Scenes/Battleground/Systems/UnitManager";
import { Chara } from "../Chara";
import { HALF_TILE_WIDTH, TILE_WIDTH } from "../../../Scenes/Battleground/constants";
import { tween } from "../../../Utils/animation";

export async function slash(
	scene: BattlegroundScene,
	unit: Unit,
) {
	const activeChara = UnitManager.getChara(unit.id);

	await popText({ text: "Slash", targetId: unit.id });

	for (let i = 0; i < unit.multicast; i++) {

		const target = await getMeleeTarget(activeChara);
		if (!target) return;
		const targetUnit = getBattleUnit(scene.state)(target.id);
		const targetChara = UnitManager.getChara(targetUnit.id);

		await attack(activeChara, targetChara);
	}

	// return to the original position
	await tween({
		targets: [activeChara.container],
		x: activeChara.unit.position.x * TILE_WIDTH + HALF_TILE_WIDTH,
		Y: activeChara.unit.position.y * TILE_WIDTH + HALF_TILE_WIDTH,
		duration: 500 / scene.state.options.speed,
	})
}


async function attack(activeChara: Chara, targetChara: Chara) {

	// TODO: bash piece animation gets out of sync with the physical attack logic.
	// should make it accept the physical attack function as a callback
	// currently, one's tweens interferes with the other

	await bashPieceAnimation(activeChara, targetChara.container);

	await physicalAttack(activeChara, targetChara);
}
