import { Choice, displayChoices, displayStore, newChoice } from "../Scenes/Battleground/Systems/Choice";
import * as UIManager from "../Scenes/Battleground/Systems/UIManager";
import { createWave } from "../Scenes/Battleground/Systems/WaveManager";
import { pickRandom } from "../utils";
import { FORCE_ID_PLAYER } from "./Force";
import { JobId, jobs } from "./Job";
import { emit, signals } from "./Signals";
import { getState, State } from "./State";

let scene: Phaser.Scene;
let state: State;

export const init = (s: Phaser.Scene) => {
	scene = s;
	state = getState();
}

export type Event = {
	id: string;
	level: number;
	title: string;
	description: string;
	pic: string;
	triggers: {
		type: "nested";
		choices: () => Choice[];
		onChoice: (choice: Choice) => void;
	} | {
		type: "instant"
		onSelect: () => void;
	} | {
		type: "shop"
		choices: () => Choice[];
	}

}
const starterEvent: Event = {
	id: "1",
	level: 1,
	title: "Start your guild",
	description: "Recruit the first member of your guild",
	pic: "icon/quest",
	triggers: {
		type: "nested",
		choices: () => {
			return pickRandom(jobs, 3).map(job => newChoice(
				`${job.id}/full`,
				job.name,
				job.description,
				job.id,
			));
		},
		onChoice: async (choice: Choice) => {
			emit(signals.ADD_UNIT_TO_GUILD, FORCE_ID_PLAYER, choice.value as JobId);
		}
	}
}


const randomEvents: Event[] = [
	{
		id: "2",
		level: 1,
		title: "Odd Job",
		description: "You have been offered a job for 3 gold",
		pic: "icon/quest",
		triggers: {
			type: "instant",
			onSelect: () => {
				const playerForce = state.gameData.forces.find(f => f.id === FORCE_ID_PLAYER)!;
				playerForce.gold += 3;
				UIManager.updateUI();
			},
		}
	},
	{
		id: "3",
		level: 1,
		title: "A new friend",
		description: "You have made a new friend",
		pic: "icon/quest",
		triggers: {
			type: "instant",
			onSelect: () => {
				emit(signals.ADD_UNIT_TO_GUILD, FORCE_ID_PLAYER, "blob" as JobId);
			}
		}
	},
	{
		id: "4",
		level: 1,
		title: "Pick some fruit",
		description: "Get a random fruit",
		pic: "icon/quest",
		triggers: {
			type: "instant",
			onSelect: () => {
				const playerForce = state.gameData.forces.find(f => f.id === FORCE_ID_PLAYER)!;
				playerForce.gold += 33;
				UIManager.updateUI();
			}
		}
	},
	{
		id: "5",
		level: 1,
		title: "Market Day",
		description: "A traveling merchant offers special goods at reduced prices",
		pic: "icon/quest",
		triggers: {
			type: "shop",
			choices: () => {
				return [
					newChoice("icon/quest", "Buy Equipment", "Upgrade your guild's gear (+5 attack)", "test_item_1"),
					newChoice("icon/quest", "Buy Potions", "Stock up on healing supplies (+10 health)", "test_item_2"),
					newChoice("icon/quest", "Buy Chocolate", "Treat yourself to a sweet snack", "test_item_3")
				];
			}
		}
	},
	{
		id: "6",
		level: 2,
		title: "Advanced Training",
		description: "An opportunity to train your guild members",
		pic: "icon/quest",
		triggers: {
			type: "instant",
			onSelect: () => {
				// emit(signals.BOOST_GUILD_UNITS, FORCE_ID_PLAYER, 2);
				// UIManager.updateUI();
			}
		}
	},
	{
		id: "7",
		level: 1,
		title: "Lost Treasure",
		description: "You stumble upon a hidden chest in the forest",
		pic: "icon/quest",
		triggers: {
			type: "instant",
			onSelect: () => {
				const playerForce = state.gameData.forces.find(f => f.id === FORCE_ID_PLAYER)!;
				playerForce.gold += 10;
				UIManager.updateUI();
			}
		}
	},
	{
		id: "8",
		level: 2,
		title: "Mysterious Stranger",
		description: "A cloaked figure approaches your guild hall",
		pic: "icon/quest",
		triggers: {
			type: "nested",
			choices: () => {
				return [
					newChoice("recruit", "Recruit Them", "Invite the stranger to join your guild", "recruit"),
					newChoice("bribe", "Bribe for Info", "Pay 5 gold for valuable information", "bribe"),
					newChoice("ignore", "Turn Away", "You don't trust mysterious figures", "ignore")
				];
			},
			onChoice: (choice: Choice) => {
				const playerForce = state.gameData.forces.find(f => f.id === FORCE_ID_PLAYER)!;
				if (choice.value === "recruit") {
					emit(signals.ADD_UNIT_TO_GUILD, FORCE_ID_PLAYER, pickRandom(jobs, 1)[0].id as JobId);
				} else if (choice.value === "bribe" && playerForce.gold >= 5) {
					playerForce.gold -= 5;
					playerForce.gold += 15; // Information leads to greater reward
					UIManager.updateUI();
				}
			}
		}
	}
];

const monsterEvents: Event[] = [
	{
		id: "9",
		level: 1,
		title: "Monster Attack",
		description: "A monster is attacking the village",
		pic: "icon/quest",
		triggers: {
			type: "instant",
			onSelect: async () => {
				await createWave(11)
			}
		}
	},
	{
		id: "10",
		level: 2,
		title: "Goblin Raid",
		description: "A band of goblins is raiding the village",
		pic: "icon/quest",
		triggers: {
			type: "instant",
			onSelect: async () => {
				await createWave(12)
			}
		}
	},
	{
		id: "11",
		level: 3,
		title: "Dragon Sighting",
		description: "A dragon has been spotted near the village",
		pic: "icon/quest",
		triggers: {
			type: "instant",
			onSelect: async () => {
				await createWave(13)
			}
		}
	}
];

export const events: Event[] = [
	starterEvent,
	...randomEvents,
	...monsterEvents
];

export const evalEvent = async (event: Event) => {

	if (event.triggers.type === "nested") {

		const choice = await displayChoices(event.triggers.choices());
		event.triggers.onChoice?.(choice);
	}

	if (event.triggers.type === "instant") {
		await event.triggers.onSelect();
	}

	if (event.triggers.type === "shop") {
		await displayStore(event.triggers.choices());
	}

	return true;

}

export const displayRandomEvents = async (day: number) => {
	const randomItems = pickRandom(randomEvents, 3);
	const chosenEvent = await displayChoices(randomItems.map(e =>

		newChoice(e.pic, e.title, e.description, e.id)));

	const event = events.find(e => e.id === chosenEvent.value);

	if (!event) throw new Error("Event not found");

	await evalEvent(event);

}

export const displayMonsterEvents = async (day: number) => {
	const randomItems = pickRandom(monsterEvents, 3);
	const chosenEvent = await displayChoices(
		randomItems.map(e => newChoice(e.pic, e.title, e.description, e.id))
	);

	const event = events.find(e => e.id === chosenEvent.value);

	if (!event) throw new Error("Event not found");

	await evalEvent(event);
}