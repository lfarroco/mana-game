import { Unit } from "@Models/Entities/Unit";
import * as constants from "@Constants/constants";
import { Chara, getCharaById, getUnit } from "./Chara";
import { createChip, updateChipText } from "@Components/Chip";
import { vec2 } from "@Models/Geometry";
import { compactNumber } from "utils";
import { ABILITY_COLORS } from "@Models/Abilities";


export function create(unit: Unit, container: Chara) {
	const displayableEffects = ["heal", "damage", "shield", "poison", "regen"];

	const effect = unit.effects.find((effect) => displayableEffects.includes(effect.id));

	if (!effect) return;

	const displayedPower = compactNumber(Math.floor(unit.power));

	const powerDisplayPosition = vec2(0, constants.HALF_TILE_HEIGHT - 10);

	const bgColor = effect
		? parseInt(ABILITY_COLORS[effect.id].replace(/^#/, "").substring(0, 6), 16)
		: 0xeaeaea;

	const chip = createChip(unit.id, powerDisplayPosition, bgColor, displayedPower.toString());

	container.add(chip.container);
}

export function updatePowerDisplay(id: string) {
	const chara = getCharaById(id);
	const state = getUnit(chara);

	const power = compactNumber(state.power);

	updateChipText(id, power);
}
