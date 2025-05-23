import { cards, Card } from "../../Models/Card";
import { cpuForce } from "../../Models/Force";
import { vec2 } from "../../Models/Geometry";
import { State } from "../../Models/State";
import * as TraitSystem from "../../Models/Traits";
import { makeUnit } from "../../Models/Unit";
import { pickOne } from "../../utils";

export function generateEnemyTeam(state: State, count: number) {

	if (count < 2) {
		console.warn("Enemy team count is less than 2, setting to 2");
		count = 2;
	}

	if (count > 9) {
		console.warn("Enemy team count is greater than 9, setting to 9");
		count = 9;
	}

	// t = tank
	// r = ranged dps
	// s = support
	// m = melee dps
	const templates: { [hour: number]: string[]; } = {
		2: [
			`
			xxx
			sxm
			xxx`,
			`
			xxm
			xxx
			xxm
			`,
			`
			xxx
			rxt
			xxx
			`,
		],
		3: [
			`
    xxx
    rst
    xxx
    `,
			`
    xxm
    xsx
    xxm
    `,
			`
    xxx
    xxt
    rxm
    `
		],
		4: [
			`
      rxm
      xxx
      rxm
      `,
			`
      xxx
      rsm
      xxm
      `,
			`
      xxm
      sxm
      xxm
      `,
			`
      rxx
      rxm
      rxx
      `
		],
		5: [
			`
      rxm
      xxt
      rxm
      `,
			`
      rxt
      rst
      xxx
      `,
			`
      xxm
      rst
      xxm
      `,
		],
		6: [
			`
      rxm
      rxm
      rxm
      `,
			`
      sxm
      xxt
      sxm
      `,
		],
		7: [
			`
      rxm
      rsm
      rxm
      `,
			`
      rxt
      rsm
      rxt
      `,
			`
      sxt
      rsm
      sxt
      `,
		],
		8: [
			`
      rxt
      rsm
      rst
      `,
			`
      srt
      sxt
      srt
      `,
		],
		9: [
			`
      rst
      rst
      rst
      `,
			`
      rrm
      sst
      rrm
      `,
		],
	};

	const template = pickOne(templates[count]);

	const parsed = template.split("\n")
		.filter(line => line.trim() !== "")
		.map(line => line.trim().split(""));

	const getRanged = () => cards.filter(c => c.traits.includes(TraitSystem.RANGED.id));
	const getMelee = () => cards.filter(c => c.traits.includes(TraitSystem.MELEE.id));
	const getSupport = () => cards.filter(c => c.traits.includes(TraitSystem.SUPPORT.id));
	const getTank = () => cards.filter(c => c.traits.includes(TraitSystem.TAUNT.id));

	for (let y = 0; y < parsed.length; y++) {
		const row = parsed[y];
		for (let x = 0; x < row.length; x++) {
			const char = row[x];
			let card: Card | undefined;
			switch (char) {
				case "r":
					card = pickOne(getRanged());
					break;
				case "m":
					card = pickOne(getMelee());
					break;
				case "s":
					card = pickOne(getSupport());
					break;
				case "t":
					card = pickOne(getTank());
					break;
				default:
					break;
			}
			if (card !== undefined) {
				state.battleData.units.push(makeUnit(cpuForce.id, card.id, vec2(x + 1, y + 1)));
			}
		}
	}

}
