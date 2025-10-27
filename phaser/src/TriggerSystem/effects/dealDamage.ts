import { applyDamageToForce } from '@Models/Entities/Force';
import { Unit } from '@Models/Entities/Unit';
import * as CombatStatsTracker from '@Scenes//Battleground/Systems/CombatStatsTracker';
import { getCharaById } from '@Systems/Chara/Chara';
import { arcaneMissileTargeted } from '../../Effects/arcaneMissileTargeted';

export function dealDamageLogicIO(sourceUnit: Unit) {

	let damageAmount = sourceUnit.power;

	const targetForce = state.battleData.forces.find(
		(force: { id: string }) => force.id !== sourceUnit.force
	)!;

	const enemyCore = state.battleData.units.find(
		(unit: { force: string, isCore: boolean }) => unit.force === targetForce.id && unit.isCore
	);

	const effect = () => {
		const actualMoraleChange = applyDamageToForce(targetForce, damageAmount);
		CombatStatsTracker.trackDamage(sourceUnit.id, actualMoraleChange, 'normal');
	}

	arcaneMissileTargeted(
		getCharaById(sourceUnit.id),
		getCharaById(enemyCore!.id),
		{
			// Red tones
			colors: [0xff691E, 0xaa853F, 0x66A460],
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