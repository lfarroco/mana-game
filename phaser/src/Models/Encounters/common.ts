import { playerForce } from "../Force";
import { ITEMS } from "../Item";
import { heroCards } from "../Card";
import { Encounter, makeEncounter } from "./Encounter";
import { pickRandom } from "../../utils";
import { newChoice } from "../../Scenes/Battleground/Systems/Choice";
import { images } from "../../assets";

const commonEvents = (): Encounter[] => [
	potionVendor(),
	equipmentVendor(),
	tavern()
];

export const tavern = (): Encounter => ({
	id: "2",
	title: "The Tavern",
	description: "Recruit new members for your guild",
	pic: images.tavern.key,
	triggers: {
		type: "pick-unit",
		totalPicks: 1,
		title: "The Tavern",
		allowSkipping: true,
		choices: () => {
			const playerJobs = playerForce.units.map(u => u.job);
			const remaning = heroCards.filter(card => !playerJobs.includes(card.id));
			const randomJobs = pickRandom(remaning, 3);
			return randomJobs.map(job => newChoice(
				`charas/${job.id}`,
				job.name,
				job.description,
				job.id,
			));
		}
	}
});

export const equipmentVendor = () => makeEncounter("equipment_vendor", "Equipment Vendor", "You have found an equipment vendor", images.equipment_vendor.key, {
	type: "item-shop",
	choices: () => [
		ITEMS.IRON_SWORD(),
		ITEMS.GOLD_RING(),
		ITEMS.IRON_SWORD(),
		ITEMS.IRON_SWORD(),
		ITEMS.IRON_SWORD(),
		ITEMS.IRON_SWORD(),
		ITEMS.GOLD_RING(),
		ITEMS.GOLD_RING(),
	]
})


export default commonEvents;
function potionVendor(): Encounter {
	return makeEncounter("potion_vendor", "Potion Vendor", "You have found a potion vendor", images.potion_vendor.key, {
		type: "item-shop",
		choices: () => [
			ITEMS.RED_POTION(),
			ITEMS.TOXIC_POTION(),
		]
	});
}

