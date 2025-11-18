import { Unit } from "@Models/Entities/Unit";
import * as constants from "@Constants/constants";
import { Chara, getCharaById, getUnit } from "./Chara";
import { createChip, updateChipText } from "@Components/Chip";
import { vec2 } from "@Models/Geometry";

const POWER_DISPLAY_COLORS = {
	DAMAGE_BG: 0xff0000,
	HEAL_BG: 0x23a423,
	ARMOR_BG: 0xd1d135,
	POISON_BG: 0x9932cc,
	REGEN_BG: 0x337a31,
	DEFAULT_BG: 0x29a1b9ff,
} as const;

export function create(unit: Unit, container: Chara) {
	const displayableEffects = ["heal", "damage", "shield", "poison", "regen"];

	const effect = unit.effects.find((effect) => displayableEffects.includes(effect.id));

	if (!effect) return;

	const displayedPower = Math.floor(unit.power);

	const powerDisplayPosition = vec2(0, constants.HALF_TILE_HEIGHT);

	const colorMap = {
		damage: POWER_DISPLAY_COLORS.DAMAGE_BG,
		heal: POWER_DISPLAY_COLORS.HEAL_BG,
		shield: POWER_DISPLAY_COLORS.ARMOR_BG,
		poison: POWER_DISPLAY_COLORS.POISON_BG,
		regen: POWER_DISPLAY_COLORS.REGEN_BG,
	};
	const bgColor = effect
		? colorMap[effect.id as keyof typeof colorMap]
		: POWER_DISPLAY_COLORS.DEFAULT_BG;

	const chip = createChip(unit.id, powerDisplayPosition, bgColor, displayedPower.toString());

	container.add(chip);
}

export function updatePowerDisplay(id: string) {
	const chara = getCharaById(id);
	const state = getUnit(chara);

	updateChipText(id, state.power.toString());
}
