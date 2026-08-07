import * as constants from "@Constants";
import * as Chara from "@Components/Chara/Chara";
import * as Chip from "@Components/Chip/Chip";
import * as Utils from "@utils";
import * as Abilities from "@Models/Abilities";
import { Unit } from "@game/Models";
import { env } from "@Env";

export function create(unit: Unit, container: Chara.Chara) {
	const displayableEffects = ["heal", "damage", "shield", "poison", "regen"];

	const effect = unit.effects.find((effect) => displayableEffects.includes(effect.id));

	const displayedPower = Utils.compactNumber(Math.floor(unit.power));

	const bgColor = effect
		? parseInt(Abilities.ABILITY_COLORS[effect.id].replace(/^#/, "").substring(0, 6), 16)
		: 0xeaeaea;

	const chip = Chip.createChip(
		unit.id,
		[0, constants.HALF_TILE_HEIGHT - 10],
		bgColor,
		displayedPower.toString()
	);

	container.add(chip.container);
}

export function updatePowerDisplay(id: string) {
	const chara = Chara.mustGetCharaById(id);
	const charaUnit = Chara.getUnit(chara);
	const boardUnit = env.state.combatState?.unitById.get(id);
	const sessionUnit = env.state.session.team.units.find((unit) => unit.id === id);
	const latestUnit =
		env.state.session.phase === "combat"
			? boardUnit ?? sessionUnit ?? charaUnit
			: sessionUnit ?? boardUnit ?? charaUnit;

	const power = Utils.compactNumber(Math.floor(latestUnit.power));

	Chip.updateChipText(id, power);
}
