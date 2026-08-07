import * as Chara from "@Components/Chara/Chara";
import * as colorUtils from "@Utils/colorUtils";
import * as Constants from "@Constants";
import * as MagicOrbShader from "@Components/MagicOrb/MagicOrbShader";
import { Unit } from "@game/Models";
import { env } from "@Env";

const bronze = 0x804a00;
const silver = 0xc0c0c0;
const gold = 0xffd700;
const platinum = 0xb9f2ff;

const colors = [bronze, silver, gold, platinum];

export function create(unit: Unit, chara: Chara.Chara) {
	const { x, y, z } = colorUtils.hexToVector3(colors[unit.rank - 1] || bronze);

	const orb = env.shader(
		MagicOrbShader.simpleMagicOrbFragmentShader,
		[0, 0],
		[Constants.TILE_WIDTH * 0.7, Constants.TILE_WIDTH * 0.7],
		[
			{
				key: "color1",
				type: "3f",
				value: [x ?? 0, y ?? 0, z ?? 0],
			},
			{
				key: "intensity",
				type: "1f",
				value: 1.2,
			},
			{
				key: "speed",
				type: "1f",
				value: 1.0,
			},
		]
	);

	chara.add(orb);
}
