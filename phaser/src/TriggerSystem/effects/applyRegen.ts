import { Unit } from '@Models/Entities/Unit';
import { arcaneMissileTargeted } from '../../Effects';
import { getMoraleBarTipPosition } from '@Scenes//Battleground/MoraleDisplay';
import { getCharaById } from '@Systems/Chara/Chara';
import { scene } from '@Scenes//Battleground/BattlegroundScene';
import { applyRegen } from '@Scenes//Battleground/Systems/RegenSystem';

export const applyRegenLogicIO = async (
	sourceUnit: Unit,
) => {
	const amount = sourceUnit.power * 0.1;

	const targetForce = scene.state.battleData.forces.find(force => force.id === sourceUnit.force)!;

	console.log(`[ApplyRegen] Unit power: ${sourceUnit.power}, Regen rate: ${amount}, Total healing over time: ${amount * 10}`);

	const sourceChara = getCharaById(sourceUnit.id);
	const moraleBarTipPos = getMoraleBarTipPosition(targetForce.id);
	if (!moraleBarTipPos) {
		console.warn('[ApplyRegen] Morale bar tip position not found');
		return;
	}

	arcaneMissileTargeted(
		scene,
		sourceChara,
		moraleBarTipPos,
		{
			colors: [0x00ff00, 0x32cd32, 0x90ee90], // Green colors for healing
			speedMultiplier: 1.2,
			amplitudeMin: 2,
			amplitudeMax: 8,
			particleScale: 1.0,
			impact: {
				colors: [0x00ff00, 0x32cd32],
				scale: 1.8,
				speed: 150,
				lifespan: 350,
				alpha: 0.7
			},
			onHit: async () => {
				applyRegen(targetForce, amount, sourceUnit.id);
			}
		}
	);
};
