import { Chara, } from './Chara';
import { Unit } from '@Models/Entities/Unit';
import { MagicOrb } from '@Components/MagicOrb/MagicOrb';
import { hexToVector3 } from '@Utils/colorUtils';
import { TILE_WIDTH } from '@Constants/constants';

const bronze = 0x804a00;
const silver = 0xC0C0C0;
const gold = 0xFFD700;
const platinum = 0xB9F2FF;

const colors = [
	bronze,
	silver,
	gold,
	platinum
];

export function create(unit: Unit, chara: Chara) {

	const color = colors[unit.rank - 1] || bronze;

	const orb = new MagicOrb(0, 0, {
		size: TILE_WIDTH * 0.7,
		color: hexToVector3(color),
		intensity: 1.2,
		speed: 1.0,
	});

	chara.add(orb.shader);
}

