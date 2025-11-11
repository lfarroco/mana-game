import { Chara, } from './Chara';
import { Unit } from '@Models/Entities/Unit';
import { MagicOrb } from '@Components/MagicOrb/MagicOrb';
import { hexToVector3 } from '@Utils/colorUtils';
import { TILE_WIDTH } from '@Constants/constants';


export function create(unit: Unit, chara: Chara) {

	const orb = new MagicOrb(0, 0, {
		size: TILE_WIDTH * 0.7,
		color: hexToVector3(

			unit.rank === 1 ? 0xCD7F32 :
				unit.rank === 2 ? 0xC0C0C0 :
					unit.rank === 3 ? 0xFFD700 : 0xB9F2FF

		),
		intensity: 1.2,
		speed: 1.0,
	});

	chara.add(orb.shader);
}

