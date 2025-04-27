import { ENCOUNTER_BLOBS } from "../../Scenes/Battleground/enemyWaves";
import { createWave } from "../../Scenes/Battleground/Systems/WaveManager";
import { State } from "../State";
import { Encounter, makeEncounter, TIER } from "./Encounter";

const monsterEvents = (): Encounter[] => [
	makeEncounter("monster_attack", TIER.COMMON, "What about Blob?", "Explore the Magical Forest, home of the blobs", "icon/forest_entrance", {
		type: "instant",
		action: async (_scene, _state: State) => {
			await createWave(ENCOUNTER_BLOBS);
		}
	}),
	makeEncounter("bandit_ambush", TIER.COMMON, "Bandit Ambush", "A group of bandits is attacking the village", "icon/agility_training", {
		type: "instant",
		action: async (_scene, _state: State) => {
			await createWave(ENCOUNTER_BLOBS);
		}
	}),
	makeEncounter("undead_horde", TIER.COMMON, "Undead Horde", "A horde of undead is attacking the village", "icon/agility_training", {
		type: "instant",
		action: async (_scene, _state: State) => {
			await createWave(ENCOUNTER_BLOBS);
		}
	}),
]

export default monsterEvents;