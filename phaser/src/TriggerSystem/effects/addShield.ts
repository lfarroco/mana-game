import { Force, manipulateForceShield } from '@Models/Entities/Force';
import { Unit } from '@Models/Entities/Unit';
import { getState } from '@Models/State';
import { scene } from '@Scenes//Battleground/BattlegroundScene';
import * as CombatStatsTracker from '@Scenes//Battleground/Systems/CombatStatsTracker';

export function createAddShieldLogic(
	emitter: (unit: Unit, amount: number) => void,
	addShield: (targetForce: Force, amount: number, scene: Phaser.Scene) => void
) {
	return async (sourceUnit: Unit) => {

		const shieldAmount = sourceUnit.power;

		emitter(sourceUnit, shieldAmount);

		const sourceForce = getState().battleData.forces.find(
			(force) => force.id === sourceUnit.force
		)!;

		addShield(sourceForce, shieldAmount, scene);
	};
}

export const addShieldLogicIO = async (sourceUnit: Unit) => {

	const emitter = (unit: Unit, amount: number) => {
		CombatStatsTracker.trackShieldGained({
			unit,
			amount,
			sourceUnitId: sourceUnit.id
		});
	}

	const addShieldWithTracking = (targetForce: Force, amount: number): number => {
		const actualShieldChange = manipulateForceShield(targetForce, amount);

		if (actualShieldChange > 0) {
			CombatStatsTracker.trackShield(sourceUnit.id, actualShieldChange);
		}

		return actualShieldChange;
	};

	const impl = createAddShieldLogic(emitter, addShieldWithTracking);
	await impl(sourceUnit);

};
