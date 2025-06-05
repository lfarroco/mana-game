import { Card } from "../../Models/Card";
import { cpuForce } from "../../Models/Force";
import { vec2 } from "../../Models/Geometry";
import { State } from "../../Models/State";
import * as TraitSystem from "../../Models/Traits";
import { makeUnit } from "../../Models/Unit";
import { pickOne } from "../../utils";

export function generateEnemyTeam(
	state: State,
	count: number,
	cards: Card[],
) {

	if (count < 2) {
		console.warn("Enemy team count is less than 2, setting to 2");
		count = 2;
	}

	if (count > 5) {
		console.warn("Enemy team count is greater than 9, setting to 9");
		count = 5;
	}

	// t = tank
	// r = ranged dps
	// s = support
	// m = melee dps
	const templates: { [hour: number]: string[][]; } = {
		2: [
			[
				".r.",
				"...",
				".m."
			],
			[
				"...",
				"...",
				"m.m"
			],
			[
				"r.r",
				"...",
				"...",
			]
		],
		3: [
			[
				"...",
				"...",
				"mmm"
			],
			[
				"r.r",
				".r.",
				"..."

			],
			[
				"...",
				".r.",
				"m.m"
			]
		],
		4: [
			[
				"r.r",
				"...",
				"m.m"
			],
			[
				"rrr",
				"...",
				".m."
			]
		],
		5: [
			[
				"r.m",
				"..m",
				"r.m"
			],
			[
				"r.m",
				"r..",
				"r.m"
			]
		]
	};

	const template = pickOne(templates[count]);

	const parsed = template.map(row => row.split(""));

	const getRanged = () => cards.filter(c => c.traits.some(t => t.id === TraitSystem.RANGED.id));
	const getMelee = () => cards.filter(c => c.traits.some(t => t.id === TraitSystem.MELEE.id));
	const getSupport = () => cards.filter(c => c.traits.some(t => t.id === TraitSystem.SUPPORT.id));
	const getTank = () => cards.filter(c => c.traits.some(t => t.id === TraitSystem.TAUNT.id));

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

				const unit = makeUnit(cpuForce.id, card.name, vec2(x, y));
				state.battleData.units.push(unit);
			}
		}
	}

}
