import { Unit } from "@Models/Entities/Unit";
import * as constants from "@Constants/constants";
import { Chara } from "./Chara";
import { createChip, updateChipText } from "@Components/Chip";
import { vec2 } from "@Models/Geometry";

export function create(unit: Unit, container: Chara) {
	const chip = createChip(
		unit.id,
		vec2(0, constants.HALF_TILE_HEIGHT),
		0x29a1b9ff,
		unit.life.toString()
	);

	container.add(chip);
}

export function updateLifeDisplay(id: string, life: number) {
	updateChipText(id, Math.floor(life).toString());
}
