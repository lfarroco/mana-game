
import { Encounter } from "./Encounter";



const monsterEvents = (): Encounter[] => [
	// makeEncounter("monster_attack", TIER.COMMON, "What about Blob?", "Explore the Magical Forest, home of the blobs", "icon/forest_entrance", {
	// 	type: "instant",
	// 	action: async (_scene, state: State) => {
	// 		await encounter(state)(ENCOUNTER_BLOBS());
	// 	}
	// }),
	// makeEncounter("bandit_ambush", TIER.COMMON, "Bandit Ambush", "A group of bandits is attacking the village", "icon/agility_training", {
	// 	type: "instant",
	// 	action: async (_scene, state: State) => {
	// 		await encounter(state)(ENCOUNTER_BLOBS());
	// 	}
	// }),
	// makeEncounter("undead_horde", TIER.COMMON, "Undead Horde", "A horde of undead is attacking the village", "charas/skeleton", {
	// 	type: "instant",
	// 	action: async (_scene, state: State) => {
	// 		await encounter(state)(ENCOUNTER_UNDEAD());
	// 	}
	// }),
]

export default monsterEvents;