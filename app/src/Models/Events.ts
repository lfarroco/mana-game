import { Choice, displayChoices, newChoice } from "../Scenes/Battleground/Systems/Choice";
import * as UIManager from "../Scenes/Battleground/Systems/UIManager";
import { pickRandom } from "../utils";
import { FORCE_ID_PLAYER } from "./Force";
import { vec2 } from "./Geometry";
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
		choices: () => Choice[];
		onChoice: (choice: Choice) => void;
	} | {
		onSelect: () => void;
	}
}
const starterEvent = {
	id: "1",
	level: 1,
	title: "Start your guild",
	description: "Recruit the first member of your guild",
	pic: "https://via.placeholder.com/150",
	triggers: {
		choices: () => {
			return pickRandom(jobs, 3).map(job => newChoice(
				`${job.id}/full`,
				job.name,
				job.description,
				job.id,
			));
		},
		onChoice: async (choice: Choice) => {
			console.log(">>>", choice);

			emit(signals.ADD_UNIT_TO_GUILD, FORCE_ID_PLAYER, choice.value as JobId, vec2(7, 3));
		}
	}
}


const randomEvents = [
	{
		id: "2",
		level: 1,
		title: "Odd Job",
		description: "You have been offered a job for 3 gold",
		pic: "https://via.placeholder.com/150",
		triggers: {
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
		pic: "https://via.placeholder.com/150",
		triggers: {
			onSelect: () => {
				emit(signals.ADD_UNIT_TO_GUILD, FORCE_ID_PLAYER, "blob" as JobId, vec2(7, 3));
			}
		}
	},
	{
		id: "4",
		level: 1,
		title: "Pick some fruit",
		description: "Get a random fruit",
		pic: "https://via.placeholder.com/150",
		triggers: {
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
		pic: "https://via.placeholder.com/150",
		triggers: {
			choices: () => {
				return [
					newChoice("buy_item", "Buy Equipment", "Upgrade your guild's gear (+5 attack)", "buy_item"),
					newChoice("buy_potion", "Buy Potions", "Stock up on healing supplies (+10 health)", "buy_potion"),
					newChoice("decline", "Decline", "Save your gold for another day", "decline")
				];
			},
			onChoice: (choice: Choice) => {
				const playerForce = state.gameData.forces.find(f => f.id === FORCE_ID_PLAYER)!;
				if (choice.value === "buy_item" && playerForce.gold >= 5) {
					playerForce.gold -= 5;
					// Apply attack bonus logic here
					UIManager.updateUI();
				} else if (choice.value === "buy_potion" && playerForce.gold >= 3) {
					playerForce.gold -= 3;
					// Apply health bonus logic here
					UIManager.updateUI();
				}
			}
		}
	},
	{
		id: "6",
		level: 2,
		title: "Advanced Training",
		description: "An opportunity to train your guild members",
		pic: "https://via.placeholder.com/150",
		triggers: {
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
		pic: "https://via.placeholder.com/150",
		triggers: {
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
		pic: "https://via.placeholder.com/150",
		triggers: {
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
					emit(signals.ADD_UNIT_TO_GUILD, FORCE_ID_PLAYER, pickRandom(jobs, 1)[0].id as JobId, vec2(7, 3));
				} else if (choice.value === "bribe" && playerForce.gold >= 5) {
					playerForce.gold -= 5;
					playerForce.gold += 15; // Information leads to greater reward
					UIManager.updateUI();
				}
			}
		}
	}
];

export const events: Event[] = [
	starterEvent,
	...randomEvents
];

export const evalEvent = async (event: Event) => {

	if ('choices' in event.triggers) {

		const choice = await displayChoices(event.title, event.triggers.choices());
		event.triggers.onChoice?.(choice);
	}

	if ('onSelect' in event.triggers) {
		event.triggers.onSelect();
	}

	return true;

}

export const displayRandomEvents = async () => {
	const randomItems = pickRandom(randomEvents, 3);
	const chosenEvent = await displayChoices("Random event", randomItems.map(e => newChoice(e.id, e.title, e.description, e.id)));

	const event = events.find(e => e.id === chosenEvent.value);

	if (!event) throw new Error("Event not found");

	await evalEvent(event);

}