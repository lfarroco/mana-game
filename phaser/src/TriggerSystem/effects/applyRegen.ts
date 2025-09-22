import { Unit } from '@Models/Entities/Unit';
import { scene } from '@Scenes//Battleground/BattlegroundScene';
import { applyRegen } from '@Scenes//Battleground/Systems/RegenSystem';

export const applyRegenLogicIO = async (
	sourceUnit: Unit,
) => {
	const amount = sourceUnit.power * 0.1;

	const targetForce = scene.state.battleData.forces.find(force => force.id === sourceUnit.force)!;

	console.log(`[ApplyRegen] Unit power: ${sourceUnit.power}, Regen rate: ${amount}, Total healing over time: ${amount * 10}`);

	applyRegen(targetForce, amount, sourceUnit.id);
};
