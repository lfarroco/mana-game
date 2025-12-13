import { Unit } from "@Models/Entities/Unit";
import { Chara, getCharaById, updateUnitPower } from "@Systems/Chara/Chara";
import { arcaneMissileTargeted } from "../../Effects";

export const decreasePower = async (
	targets: Unit[],
	percentage: number,
	permanent: boolean,
	sourceUnit?: Unit
) => {
	const effect = (targetChara: Chara, targetUnit: Unit) => async () => {
		// Ensure we don't reduce below 0 if that's a requirement, but usually power can be negative? 
		// The requirement said "reduces power by percentage". 
		// Usually formatted as "decrease power BY X%". 
		// If power is 100, decrease by 10% -> remove 10.
		// If power is -10, decrease by 10% -> this is ambiguous. 
		// Assuming magnitude reduction or signed reduction? 
		// Standard interpretation: newPower = oldPower - (oldPower * percentage / 100) = oldPower * (1 - percentage/100)
		// Wait, "updateUnitPower" adds. So we need to calculate the negative delta.
		// delta = -(targetUnit.power * percentage / 100)

		const delta = -Math.floor(targetUnit.power * (percentage / 100));
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

		// Visuals: Violet/Purple for decrease power
		arcaneMissileTargeted(sourceChara, targetChara, {
			colors: [0x8a2be2, 0x9400d3, 0x9932cc], // BlueViolet, DarkViolet, DarkOrchid
			amplitudeMin: 5,
			amplitudeMax: 15,
			particleScale: 1.5,
			impact: {
				colors: [0x8a2be2, 0x9400d3],
				scale: 2,
				speed: 200,
				lifespan: 300,
				alpha: 0.4,
			},
			onHit: effect(targetChara, target),
		});
	}
};
