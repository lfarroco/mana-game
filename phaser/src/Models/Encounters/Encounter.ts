import { Choice, displayChoices, newChoice } from "../../Scenes/Battleground/Systems/Choice";
import * as UnitManager from "../../Scenes/Battleground/Systems/CharaManager";
import * as Chara from "../../Systems/Chara/Chara";
import * as Tooltip from "../../Systems/Tooltip";
import { pickRandom } from "../../utils";
import { delay, tween } from "../../Utils/animation";
import * as Force from "../Force";
import { eqVec2, Vec2, vec2 } from "../Geometry";
import { Item } from "../Item";
import { getAllCards } from "../Card";
import { getState, State } from "../State";
import * as Board from "../Board";
import { makeUnit } from "../Unit";
import commonEvents from "./common";
import monsterEvents from "./monster";
import * as Flyout from "../../Systems/Flyout";
import { getTileAt } from "../Board";
import * as constants from "../../Scenes/Battleground/constants";
import * as UIManager from "../../Scenes/Battleground/Systems/UIManager";

let scene: Phaser.Scene;
export let state: State;

export const init = (s: Phaser.Scene) => {
	scene = s;
	state = getState();
}

export type Encounter = {
	id: string;
	title: string;
	description: string;
	/* a prompt used to generate the event's icon */
	prompt?: string;
	pic: string;
	triggers: {
		type: "instant"
		action: (scene: Phaser.Scene, State: State) => void;
	} | {
		title: string;
		type: "pick-unit";
		totalPicks: number;
		allowSkipping: boolean;
		choices: () => Choice[];
	} | {
		type: "item-shop",
		choices: () => Item[];
	}

}

export const makeEncounter = (
	id: string,
	title: string,
	description: string,
	pic: string,
	triggers: Encounter["triggers"]
) => ({
	id,
	title,
	description,
	pic,
	triggers
});

export const starterEvent: Encounter = {
	id: "1",
	title: "Start your guild",
	description: "Recruit the founding members of your guild",
	pic: "icon/quest",
	triggers: {
		type: "pick-unit",
		totalPicks: 2,
		title: "Choose your starting members",
		allowSkipping: false,
		choices: () => {

			const playerJobs = Force.playerForce.units.map(u => u.job);
			const remaning = getAllCards().filter(j => !playerJobs.includes(j.name));
			return pickRandom(remaning, 3)
				.map(card => newChoice(card.pic, card.name, "", card.name))
		}
	}
}

export const pickAHero: Encounter = {
	id: "2",
	title: "Pick a hero",
	description: "Choose a hero to join your guild",
	pic: "icon/quest",
	triggers: {
		type: "pick-unit",
		totalPicks: 1,
		title: "Choose a hero",
		allowSkipping: true,
		choices: () => {

			const filtered =
				getAllCards().filter(card =>
					!state.gameData.player.units.map(u => u.job).includes(card.name)
				);

			return pickRandom(filtered, 3)
				.map(card => newChoice(
					card.pic,
					card.name,
					"",
					card.name
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
			await pickUnit(event.triggers.choices, event.triggers.totalPicks, event.triggers.allowSkipping, event.triggers.title);
			break;
		case "item-shop":
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

const pickUnit = async (
	genChoices: () => Choice[],
	totalPicks: number,
	allowSkipping: boolean,
	title: string,
) => {

	const flyout = await Flyout.create(scene, title);

	flyout.slideIn();

	let picks = 0;

	while (totalPicks > picks) {
		await new Promise<void>(async (resolve) => {

			const charas = await Promise.all(
				genChoices().map((choice, index) => {
					const chara = new Chara.Chara(
						scene,
						makeUnit(Force.playerForce.id, choice.value, vec2(0, 0)),
					);
					UnitManager.addCharaToState(chara);
					chara.setPosition(
						580 + 250 * index,
						chara.height * -1.2,
					);
					flyout.add(chara);
					return chara
				})
			);

			charas.forEach(async (chara, index) => {
				await delay(scene, 100 + (150 * index));

				await tween({
					targets: [chara],
					y: 250,
				});

				chara.setInteractive({ draggable: true });

				chara.addTooltip();


				const pick = async () => {

					Tooltip.hide();

					if (state.gameData.player.units.length >= constants.MAX_PARTY_SIZE) {

						UIManager.displayError("Your party is full! Discard a card or skip.");
						return;
					}

					const emptySlot = Board.getEmptySlot(Force.playerForce.units, Force.playerForce.id);

					if (!emptySlot) throw new Error("No empty slot found");

					addCardToBoard(emptySlot);

				}

				const addCardToBoard = async (slot: Vec2) => {

					// Remove chara otherwise it will be slided out with the flyout as well
					flyout.remove(chara);

					picks++;

					chara.unit.position = slot;
					state.gameData.player.units.push(chara.unit);

					for (const c of charas) {

						if (chara.id === c.id) {
							const vec = UnitManager.getCharaPosition(c.unit);
							tween({
								targets: [c],
								...vec,
							});
							//Chara.addBoardEvents();
							continue;
						};

						slideOutCard(c);

					}

					resolve();
				}

				const handleDrop = async (
					pointer: Phaser.Input.Pointer,
				) => {

					if (state.gameData.player.units.length >= constants.MAX_PARTY_SIZE) {
						UIManager.displayError("Your party is full! Discard a card or skip.");
						return;
					}

					// The board will change: remove position bonuses for all units
					state.gameData.player.units.forEach((unit) => {
						unit.events.onLeavePosition.forEach(fn => fn(unit)());
					});

					const tile = getTileAt(pointer)!;

					const slot = vec2(tile.x, tile.y)!

					const maybeOccupier = state.gameData.player.units.find(u => eqVec2(u.position, slot));

					if (maybeOccupier) {
						const occupierChara = UnitManager.getChara(maybeOccupier.id);

						const slot = Board.getEmptySlot(Force.playerForce.units, Force.playerForce.id);

						occupierChara.unit.position = slot!;

						tween({
							targets: [occupierChara],
							...UnitManager.getCharaPosition(occupierChara.unit)
						})
					}

					await addCardToBoard(slot);

					// The board has changed: calculate position bonuses for all units
					state.gameData.player.units.forEach((unit) => {
						unit.events.onEnterPosition.forEach(fn => fn(unit)());
					});

				}

				const dragStartHandler = () => {
					flyout.remove(chara);
					Tooltip.hide();
				}

				const dragHandler = (pointer: Phaser.Input.Pointer) => {

					chara.x = pointer.x;
					chara.y = pointer.y;
				}

				const dropHandler = (pointer: Pointer) => {

					const wasDrag = pointer.getDistance() > 10;
					const inBoard = Board.overlapsWithPlayerBoard(pointer);

					if (!inBoard && !wasDrag) {
						pick();

						chara.off('drag', dragHandler);
						chara.off('pointerup', dropHandler);
						chara.off('dragstart', dragStartHandler);
						return
					}
					if (inBoard && wasDrag) {
						handleDrop(pointer);
						chara.off('drag', dragHandler);
						chara.off('pointerup', dropHandler);
						chara.off('dragstart', dragStartHandler);
						return;
					}

					// go back to original position
					tween({
						targets: [chara],
						x: 580 + 250 * index,
						y: 250
					});

					flyout.add(chara);

				}

				chara.on('dragstart', dragStartHandler);
				chara.on('drag', dragHandler);
				chara.on('pointerup', dropHandler);

			});

			const rerollButton = UIManager.createButton(
				`Reroll (${constants.REROLL_UNITS_PRICE})`,
				constants.SCREEN_WIDTH * 0.15,
				constants.SCREEN_HEIGHT * 0.25,
				async () => {
					Force.updatePlayerGoldIO(- constants.REROLL_UNITS_PRICE);
					charas.forEach(slideOutCard);

					rerollButton.destroy();

					await delay(scene, 500);
					resolve();
				});
			flyout.add(rerollButton);

			const updateButtonStatus = () => {
				if (state.gameData.player.gold < constants.REROLL_UNITS_PRICE) {
					UIManager.disableButton(rerollButton);
				} else {
					UIManager.enableButton(rerollButton);
				}
			}
			updateButtonStatus();

			scene.events.on("gold-changed", updateButtonStatus);

			rerollButton.on("destroy", () => {
				scene.events.off("gold-changed", updateButtonStatus);
			});

			if (allowSkipping) {
				const skipButton = UIManager.createButton(
					"Skip",
					constants.SCREEN_WIDTH * 0.75,
					constants.SCREEN_HEIGHT * 0.25,
					() => {
						charas.forEach(slideOutCard);
						picks++;
						resolve();
					});
				flyout.add(skipButton);
			}

		});

	}

	await flyout.slideOut();
	await delay(scene, 500);
	flyout.destroy();
}

function slideOutCard(c: Chara.Chara) {
	tween({
		targets: [c],
		y: -100,
		onComplete: () => {
			UnitManager.destroyChara(c.id);
		}
	});
}

