import { CardDefinition } from "../..//Models/Entities/Card";
import { cpuForce } from "../../Models/Entities/Force";
import { vec2 } from "../../Models/Geometry";
import { makeUnit } from "../../Models/Entities/Unit";
import { pickOne } from "../../utils";

// A function that receives a round and returns the enemy team size
const getEnemyTeamSize = (round: number): number => {

	const costPerUnit = 3;

	const baseSize = Math.floor(round / 2) + 2; // Start with 2 units at round 0, increase by 1 every 2 rounds
	const size = Math.min(5, baseSize + Math.floor(round / costPerUnit));
	return size;
}

export function generateEnemyTeam(
	round: number,
	pool: CardDefinition[],
) {

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

	const template = pickOne(templates[getEnemyTeamSize(round)]);

	const parsed = template.map(row => row.split(""));

	const getRanged = () => pool.filter(c => c.traits.some(t => t.id === "ranged"));
	const getMelee = () => pool.filter(c => c.traits.some(t => t.id === "melee"));
	const getSupport = () => pool.filter(c => c.traits.some(t => t.id === "support"));
	const getTank = () => pool.filter(c => c.traits.some(t => t.id === "taunt"));

	let units = [];

	for (let y = 0; y < parsed.length; y++) {
		const row = parsed[y];
		for (let x = 0; x < row.length; x++) {
			const char = row[x];
			let card: CardDefinition | undefined;
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

				const unit = makeUnit(cpuForce.id, card.id, vec2(x, y));
				units.push(unit);
			}
		}
	}

	return units;

}
