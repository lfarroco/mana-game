import { Unit } from "@Models/Entities/Unit";
import * as constants from "@Constants/constants";
import { Chara, mustGetCharaById, getUnit } from "@Systems/Chara/Chara";
import { createChip, updateChipText } from "Client/Components/Chip";
import { vec2 } from "@Models/Geometry";
import { compactNumber } from "@utils";
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
	const chara = mustGetCharaById(id);
	const charaUnit = getUnit(chara);
	const boardUnit = state.battleData.units.find((unit) => unit.id === id);
	const sessionUnit = state.session.team.units.find((unit) => unit.id === id);
	const latestUnit =
		state.session.phase === "combat"
			? boardUnit ?? sessionUnit ?? charaUnit
			: sessionUnit ?? boardUnit ?? charaUnit;

	const power = compactNumber(Math.floor(latestUnit.power));

	updateChipText(id, power);
}
