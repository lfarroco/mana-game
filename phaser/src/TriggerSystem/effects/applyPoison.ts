import { Unit } from '@Models/Entities/Unit';
import { scene } from '@Scenes//Battleground/BattlegroundScene';
import { applyPoison } from '@Scenes//Battleground/Systems/PoisonDamageSystem';

export const applyPoisonLogicIO = async (sourceUnit: Unit) => {

	const amount = sourceUnit.power * 0.1;

	const targetForce = scene.state.battleData.forces.find(force => force.id !== sourceUnit.force);

	console.log(`[ApplyPoison] Unit power: ${sourceUnit.power}, Poison rate: ${amount}, Total damage over time: ${amount * 10}`);

	if (!targetForce) {
		console.warn('[ApplyPoison] No target force found');
		return;
	}

	applyPoison(targetForce, amount, sourceUnit.id);
};
