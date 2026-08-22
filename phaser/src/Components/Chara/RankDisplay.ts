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

export function create(unit: Unit, chara: Chara.Chara): Phaser.GameObjects.Shader {
	const orb = makeRankOrb(unit);
	chara.add(orb);
	return orb;
}

function makeRankOrb(unit: Unit): Phaser.GameObjects.Shader {
	const { x, y, z } = colorUtils.hexToVector3(colors[unit.rank - 1] || bronze);

	return env.shader(
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
}

/**
 * Update the rank orb's color in place to reflect a unit's new rank, without
 * destroying and recreating the shader (which would disturb the chara's z-order).
 */
export function update(chara: Chara.Chara, unit: Unit): void {
	const orb = chara.list.find((child) => child instanceof Phaser.GameObjects.Shader) as
		Phaser.GameObjects.Shader | undefined;

	if (!orb) return;

	const { x, y, z } = colorUtils.hexToVector3(colors[unit.rank - 1] || bronze);
	orb.setUniform("color1.value", { x: x ?? 0, y: y ?? 0, z: z ?? 0 });
}
