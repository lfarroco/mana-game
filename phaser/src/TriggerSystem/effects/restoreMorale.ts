import { arcaneMissileTargeted } from "../../Effects";
import { Force, manipulateForceMorale } from "../../Models/Entities/Force";
import { Unit } from "../../Models/Entities/Unit";
import { scene } from "../../Scenes/Battleground/BattlegroundScene";
import { getMoraleBarTipPosition } from "../../Scenes/Battleground/MoraleDisplay";
import * as CombatStatsTracker from "../../Scenes/Battleground/Systems/CombatStatsTracker";
import { Chara } from "../../Systems/Chara";

export function createRestoreMoraleLogic(
	emitter: (unit: Unit, amount: number) => void,
	healMorale: (targetForce: Force, amount: number) => void
) {
	return async (context: { sourceUnit: Unit; }) => {
		const { sourceUnit } = context;

		const healAmount = sourceUnit.power;

		emitter(sourceUnit, healAmount);

		const sourceForce = scene.state.battleData.forces.find(
			(force: { id: string }) => force.id === sourceUnit.force
		)!;

		const sourceChara = Chara.getCharaById(sourceUnit.id);
		const moraleBarTipPos = getMoraleBarTipPosition(sourceForce.id);
		if (sourceChara && moraleBarTipPos) {
			arcaneMissileTargeted(
				scene,
				sourceChara,
				moraleBarTipPos,
				{
					colors: [0x00ff00, 0x32cd32, 0x7fff00], // Green colors
					amplitudeMin: 5,
					amplitudeMax: 15,
					particleScale: 1.5,
					impact: {
						colors: [0x00ff00, 0x32cd32],
						scale: 2,
						speed: 200,
						lifespan: 300,
						alpha: 0.4
					},
					onHit: async () => {
						healMorale(sourceForce, healAmount);
					}
				}
			);
		} else {
			healMorale(sourceForce, healAmount);
		}
	};
}

export const restoreMoraleLogicIO = async (context: { sourceUnit: Unit }) => {

	const { sourceUnit } = context;

	const emitter = (unit: Unit, amount: number) => {
		CombatStatsTracker.trackMoraleRestored({
			unit,
			amount,
			type: 'direct',
			sourceUnitId: sourceUnit.id
		})
	}

	const healMoraleWithPoisonReduction = (targetForce: Force, amount: number): number => {
		const actualHealing = manipulateForceMorale(targetForce, amount);

		if (actualHealing > 0) {
			CombatStatsTracker.trackHealing(sourceUnit.id, actualHealing, 'direct');
		}

		const runCombatSystem = scene.runCombatSystem;
		if (runCombatSystem && actualHealing > 0) {
			runCombatSystem.reducePoison(targetForce.id, actualHealing);
		}

		return actualHealing;
	};

	const impl = createRestoreMoraleLogic(emitter, healMoraleWithPoisonReduction);
	await impl(context);
};

export function restoreForceMoralePure(amount: number, sourceForceId: string): {
	amount: number;
	forceId: string;
} {
	return {
		amount: Math.max(0, amount),
		forceId: sourceForceId
	};
}