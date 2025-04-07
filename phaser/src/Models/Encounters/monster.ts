import { createWave } from "../../Scenes/Battleground/Systems/WaveManager";
import { State } from "../State";
import { Encounter, makeEncounter, TIER } from "./Encounter";

const monsterEvents = (): Encounter[] => [
	makeEncounter("monster_attack", TIER.COMMON, "Monster Attack", "A monster is attacking the village", "icon/quest", {
		type: "instant",
		action: async (_scene, _state: State) => {
			await createWave(12)
		}
	}),
	makeEncounter("bandit_ambush", TIER.COMMON, "Bandit Ambush", "A group of bandits is attacking the village", "icon/quest", {
		type: "instant",
		action: async (_scene, _state: State) => {
			await createWave(11)
		}
	}),
	makeEncounter("undead_horde", TIER.COMMON, "Undead Horde", "A horde of undead is attacking the village", "icon/quest", {
		type: "instant",
		action: async (_scene, _state: State) => {
			await createWave(13)
		}
	}),
]

export default monsterEvents;