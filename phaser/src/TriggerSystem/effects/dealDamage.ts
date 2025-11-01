import { applyDamageToForce } from '@Models/Entities/Force';
import { Unit } from '@Models/Entities/Unit';
import * as CombatStatsTracker from '@Scenes//Battleground/Systems/CombatStatsTracker';
import { getCharaById, shake } from '@Systems/Chara/Chara';
import { arcaneMissileTargeted } from '../../Effects/arcaneMissileTargeted';
import { getEnemyCore } from '@Models/Entities/Card';

export function dealDamageLogicIO(sourceUnit: Unit) {

	let damageAmount = sourceUnit.power;

	const targetForce = state.battleData.forces.find(
		(force: { id: string }) => force.id !== sourceUnit.force
	)!;

	const enemyCore = getEnemyCore(sourceUnit.force)

	const effect = () => {
		const actualMoraleChange = applyDamageToForce(targetForce, damageAmount);
		CombatStatsTracker.trackDamage(sourceUnit.id, actualMoraleChange, 'normal');
		shake(getCharaById(enemyCore.id));
	}

	arcaneMissileTargeted(
		getCharaById(sourceUnit.id),
		getCharaById(enemyCore!.id),
		{
			// Red tones
			colors: [0x880808, 0xEE4B2B, 0xD22B2B], //blood red, bright red, cadmium red
			amplitudeMin: 5,
			amplitudeMax: 20,
			particleScale: 1.5,
			impact: {
				colors: [0xD2691E, 0xCD853F],
				scale: 2,
				speed: 200,
				lifespan: 300,
				alpha: 0.4
			},
			onHit: effect
		}
	);

};