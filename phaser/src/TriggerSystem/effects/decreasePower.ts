import { Unit } from "@Models/Entities/Unit";
import { Chara, getCharaById, updateUnitPower } from "@Systems/Chara/Chara";
import { arcaneMissileTargeted } from "../../Effects";

export const decreasePower = async (
	targets: Unit[],
	amount: number,
	permanent: boolean,
	sourceUnit?: Unit
) => {
	const effect = (targetChara: Chara, targetUnit: Unit) => async () => {
		const newPower = Math.max(0, targetUnit.power - amount);
		const delta = newPower - targetUnit.power;
		updateUnitPower(targetChara, delta, permanent);
	};

	if (!sourceUnit) {
		for (const target of targets) {
			const targetChara = getCharaById(target.id);
			effect(targetChara, target)();
		}
		return;
	}

	const sourceChara = getCharaById(sourceUnit.id);

	for (const target of targets) {
		const targetChara = getCharaById(target.id);

		// BlueViolet, DarkViolet, DarkOrchid
		arcaneMissileTargeted(sourceChara, targetChara, {
			colors: [0x8a2be2, 0x9400d3, 0x9932cc],
			impact: {
				colors: [0x8a2be2, 0x9400d3],
			},
			onHit: effect(targetChara, target),
		});
	}
};
