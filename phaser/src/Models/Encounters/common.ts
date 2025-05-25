import { playerForce } from "../Force";
import { ITEMS } from "../Item";
import { getCard } from "../Card";
import { Encounter, makeEncounter } from "./Encounter";
import { pickRandom } from "../../utils";
import { newChoice } from "../../Scenes/Battleground/Systems/Choice";

const commonEvents = (): Encounter[] => [
	potionVendor(),
	equipmentVendor(),
	tavern()
];

export const tavern = (): Encounter => ({
	id: "2",
	title: "Tavern",
	description: "Recruit new members for your guild",
	pic: "icon/tavern",
	triggers: {
		type: "pick-unit",
		totalPicks: 1,
		title: "Choose a new guild member",
		allowSkipping: true,
		choices: () => {
			const playerJobs = playerForce.units.map(u => u.job);
			const remaning = playerForce.units.map(u => u.job).filter(job => !playerJobs.includes(job));
			const randomJobs = pickRandom(remaning, 3).map(getCard)
			return randomJobs.map(job => newChoice(
				`charas/${job.id}`,
				job.name,
				job.description,
				job.id,
			));
		}
	}
});

export const equipmentVendor = () => makeEncounter("equipment_vendor", "Equipment Vendor", "You have found an equipment vendor", "icon/equipment_vendor", {
	type: "item-shop",
	choices: () => [
		ITEMS.IRON_SWORD_COMMON(),
		ITEMS.GOLD_RING_COMMON(),
		ITEMS.IRON_SWORD_COMMON(),
		ITEMS.IRON_SWORD_COMMON(),
		ITEMS.IRON_SWORD_COMMON(),
		ITEMS.IRON_SWORD_COMMON(),
		ITEMS.GOLD_RING_COMMON(),
		ITEMS.GOLD_RING_COMMON(),
	]
})


export default commonEvents;
function potionVendor(): Encounter {
	return makeEncounter("potion_vendor", "Potion Vendor", "You have found a potion vendor", "icon/potion_vendor", {
		type: "item-shop",
		choices: () => [
			ITEMS.RED_POTION_COMMON(),
			ITEMS.TOXIC_POTION_COMMON(),
		]
	});
}

