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

export const events: Event[] = [
	{
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
	},
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
	}

];

export const renderEvent = async (event: Event) => {

	if ('choices' in event.triggers) {

		const choice = await displayChoices(event.title, event.triggers.choices());
		event.triggers.onChoice?.(choice);
	}

	if ('onSelect' in event.triggers) {
		event.triggers.onSelect();
	}

}
