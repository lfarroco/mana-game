import { applyDamageToForce } from '@Models/Entities/Force';
import { Unit } from '@Models/Entities/Unit';
import { scene } from '@Scenes//Battleground/BattlegroundScene';
import * as CombatStatsTracker from '@Scenes//Battleground/Systems/CombatStatsTracker';

export function dealDamageLogicIO(sourceUnit: Unit) {

	let damageAmount = sourceUnit.power;

	const targetForce = scene.state.battleData.forces.find(
		(force: { id: string }) => force.id !== sourceUnit.force
	)!;

	const actualMoraleChange = applyDamageToForce(targetForce, damageAmount);

	CombatStatsTracker.trackDamage(sourceUnit.id, actualMoraleChange, 'normal');
};