import { Choice, displayChoices, newChoice } from "../../Scenes/Battleground/Systems/Choice";
import { itemShop } from "../../Scenes/Battleground/Systems/ItemShop";
import * as UnitManager from "../../Scenes/Battleground/Systems/UnitManager";
import * as Chara from "../../Systems/Chara/Chara";
import * as Tooltip from "../../Systems/Tooltip";
import { pickRandom } from "../../utils";
import { delay, tween } from "../../Utils/animation";
import { playerForce } from "../Force";
import { vec2 } from "../Geometry";
import { Item } from "../Item";
import { CardId, starterCards } from "../Card";
import { getState, State } from "../State";
import { getEmptySlot } from "../Board";
import { makeUnit } from "../Unit";
import commonEvents from "./common";
import monsterEvents from "./monster";
import * as Flyout from "../../Systems/Flyout";

let scene: Phaser.Scene;
export let state: State;

export const init = (s: Phaser.Scene) => {
	scene = s;
	state = getState();
}

type Tier = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";

export const TIER: Record<Tier, Tier> = {
	COMMON: "COMMON",
	UNCOMMON: "UNCOMMON",
	RARE: "RARE",
	EPIC: "EPIC",
	LEGENDARY: "LEGENDARY"
}

export type Encounter = {
	id: string;
	tier: Tier,
	title: string;
	description: string;
	/* a prompt used to generate the event's icon */
	prompt?: string;
	pic: string;
	triggers: {
		type: "instant"
		action: (scene: Phaser.Scene, State: State) => void;
	} | {
		type: "pick-unit";
		totalPicks: number;
		choices: () => Choice[];
	} | {
		type: "item-shop",
		choices: () => Item[];
	}

}

export const makeEncounter = (
	id: string,
	tier: Tier,
	title: string,
	description: string,
	pic: string,
	triggers: Encounter["triggers"]
) => ({
	id,
	tier,
	title,
	description,
	pic,
	triggers
});

export const starterEvent: Encounter = {
	id: "1",
	tier: TIER.COMMON,
	title: "Start your guild",
	description: "Recruit the founding members of your guild",
	pic: "icon/quest",
	triggers: {
		type: "pick-unit",
		totalPicks: 3,
		choices: () => {
			const playerJobs = playerForce.units.map(u => u.job);
			const remaning = starterCards.filter(j => !playerJobs.includes(j.id));

			return pickRandom(remaning, 3).map(job => newChoice(
				`charas/${job.id}`,
				job.name,
				job.description,
				job.id,
			));
		}
	}
}

export const pickAHero: Encounter = {
	id: "2",
	tier: TIER.COMMON,
	title: "Pick a hero",
	description: "Choose a hero to join your guild",
	pic: "icon/quest",
	triggers: {
		type: "pick-unit",
		totalPicks: 1,
		choices: () => {

			console.log("pick a hero...");

			return pickRandom(starterCards, 3).map(job => newChoice(
				`charas/${job.id}`,
				job.name,
				job.description,
				job.id,
			));
		}
	}
}

const randomEvents: Encounter[] = [
	...commonEvents()
];

export const events: Encounter[] = [
	starterEvent,
	...randomEvents,
	...monsterEvents()
];

export const evalEvent = async (event: Encounter) => {

	switch (event.triggers.type) {
		case "instant":
			await event.triggers.action(scene, state);
			break;
		case "pick-unit":
			await pickUnit(event.triggers.choices, event.triggers.totalPicks);
			break;
		case "item-shop":
			await itemShop(
				event.title,
				event.triggers.choices());
			break;
		default:
			const never_: never = event.triggers;
			throw new Error(`Unknown event type: ${never_}`);
	}

	return true;

}

const displayEvents = async (eventArray: Encounter[], _day: number) => {
	const randomItems = pickRandom(eventArray, 3);
	const chosenEvent = await displayChoices(
		randomItems.map(e => newChoice(e.pic, e.title, e.description, e.id))
	);

	const event = events.find(e => e.id === chosenEvent.value);
	if (!event) throw new Error("Event not found");

	return evalEvent(event);
}

export const displayRandomEvents = (day: number) => displayEvents(randomEvents, day);
export const displayMonsterEvents = (day: number) => displayEvents(monsterEvents(), day);

const pickUnit = async (genChoices: () => Choice[], totalPicks: number) => {

	const flyout = await Flyout.create(
		scene,
		"Choose Your Guild Members",
	);

	flyout.slideIn();

	let picks = 0;

	while (totalPicks > picks) {

		await new Promise<void>(async (resolve) => {

			const charas = await Promise.all(
				genChoices().map(choice => {
					const chara = Chara.createCard(
						makeUnit(playerForce.id, choice.value as CardId, vec2(0, 1)),
					);
					chara.container.setPosition(chara.sprite.width * -1.2, 500);
					return chara
				})
			);

			charas.forEach(async (chara, i) => {
				await delay(scene, 100 + (150 * i));

				await tween({
					targets: [chara.container],
					x: 180 + 250 * i,
				})

				UnitManager.addCharaToState(chara);

				chara.zone.setInteractive({ draggable: true });

				Chara.addTooltip(chara);

				chara.zone.once('pointerup', async () => {

					picks++;

					Tooltip.hide();

					const emptySlot = getEmptySlot(playerForce.units, playerForce.id);

					if (!emptySlot) throw new Error("No empty slot found");

					chara.unit.position = emptySlot
					state.gameData.player.units.push(chara.unit);

					for (const c of charas) {

						if (chara.id === c.id) {
							const vec = UnitManager.getCharaPosition(c.unit);
							tween({
								targets: [c.container],
								...vec,
							});
							Chara.addBoardEvents(c);
							continue;
						};

						await tween({
							targets: [c.container],
							x: -100,
						})

						UnitManager.destroyChara(c.id);

					}

					resolve();


				});

			});

		});
	}

	await flyout.slideOut();
	await delay(scene, 500);
	flyout.destroy();
}

