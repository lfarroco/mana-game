import { Chara } from "./Chara";
import { Unit } from "@Models/Entities/Unit";
import { hexToVector3 } from "@Utils/colorUtils";
import { TILE_WIDTH } from "@Constants/constants";
import { Shader } from "@PhaserIO";
import { size, vec2 } from "@Models/Geometry";
import { simpleMagicOrbFragmentShader } from "@Shaders/MagicOrbShader";

const bronze = 0x804a00;
const silver = 0xc0c0c0;
const gold = 0xffd700;
const platinum = 0xb9f2ff;

const colors = [bronze, silver, gold, platinum];

export function create(unit: Unit, chara: Chara) {
	const { x, y, z } = hexToVector3(colors[unit.rank - 1] || bronze);

	const orb = Shader(simpleMagicOrbFragmentShader, vec2(0, 0), size(
		TILE_WIDTH * 0.7,
		TILE_WIDTH * 0.7
	), [
		{
			key: "color1",
			type: "3f",
			value: [x ?? 0, y ?? 0, z ?? 0]
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
	]);

	chara.add(orb);
}
