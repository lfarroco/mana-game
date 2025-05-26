import { Choice, displayChoices, newChoice } from "../../Scenes/Battleground/Systems/Choice";
import { itemShop } from "../../Scenes/Battleground/Systems/ItemShop";
import * as UnitManager from "../../Scenes/Battleground/Systems/UnitManager";
import * as Chara from "../../Systems/Chara/Chara";
import * as Tooltip from "../../Systems/Tooltip";
import { pickRandom } from "../../utils";
import { delay, tween } from "../../Utils/animation";
import { playerForce, updatePlayerGoldIO } from "../Force";
import { eqVec2, Vec2, vec2 } from "../Geometry";
import { Item } from "../Item";
import { CardId, heroCards } from "../Card";
import { getState, State } from "../State";
import { getEmptySlot, overlapsWithPlayerBoard } from "../Board";
import { makeUnit } from "../Unit";
import commonEvents from "./common";
import monsterEvents from "./monster";
import * as Flyout from "../../Systems/Flyout";
import { getTileAt } from "../../Scenes/Battleground/Systems/GridSystem";
import { HALF_TILE_HEIGHT, HALF_TILE_WIDTH, MAX_BENCH_SIZE, MAX_PARTY_SIZE, REROLL_UNITS_PRICE, TILE_HEIGHT, TILE_WIDTH } from "../../Scenes/Battleground/constants";
import * as Chest from "../../Scenes/Battleground/Systems/Chest";
import { createButton, disableButton, displayError, enableButton } from "../../Scenes/Battleground/Systems/UIManager";

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
			const playerJobs = playerForce.units.map(u => u.job);
			const remaning = heroCards.filter(j => !playerJobs.includes(j.id));

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
				heroCards.filter(card =>
					!state.gameData.player.units.map(u => u.job).includes(card.id) &&
					!state.gameData.player.bench.map(u => u?.unit?.job).includes(card.id)
				);

			return pickRandom(filtered, 3).map(job => newChoice(
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
			await pickUnit(event.triggers.choices, event.triggers.totalPicks, event.triggers.allowSkipping, event.triggers.title);
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

const pickUnit = async (genChoices: () => Choice[], totalPicks: number, allowSkipping: boolean, title: string) => {

	const flyout = await Flyout.create(
		scene,
		title,
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
					flyout.add(chara.container);
					return chara
				})
			);

			charas.forEach(async (chara, index) => {
				await delay(scene, 100 + (150 * index));

				await tween({
					targets: [chara.container],
					x: 180 + 250 * index,
				});

				UnitManager.addCharaToState(chara);

				chara.zone.setInteractive({ draggable: true });

				Chara.addTooltip(chara);

				function addToChest() {
					// Find the first empty bench slot (unit === null)
					const firstEmptyIndex = state.gameData.player.bench.findIndex(slot => !slot.unit);
					const slotIndex = firstEmptyIndex < 0 ? 0 : firstEmptyIndex;
					state.gameData.player.bench[slotIndex] = { index: slotIndex, unit: chara.unit };
					picks++;

					for (const c of charas) {
						if (chara.id === c.id) {
							const vec = vec2(
								...Chest.position
							);
							tween({
								targets: [c.container],
								x: vec.x,
								y: vec.y,
								scale: 0,
								duration: 1000,
								onComplete: () => {
									UnitManager.destroyChara(c.id);
								}
							});
							continue;
						};

						tween({
							targets: [c.container],
							x: -100,
						});

						UnitManager.destroyChara(c.id);

					}


					resolve();
				}

				const pick = async () => {

					Tooltip.hide();

					if (state.gameData.player.units.length >= MAX_PARTY_SIZE) {

						if (state.gameData.player.bench.length >= MAX_BENCH_SIZE) {
							displayError("Your party and bench are full! Discard a card or skip.");
							return;
						}
						addToChest();
						return;
					}

					const emptySlot = getEmptySlot(playerForce.units, playerForce.id);

					if (!emptySlot) throw new Error("No empty slot found");

					addCardToBoard(emptySlot);

				}

				const addCardToBoard = async (slot: Vec2) => {

					// Remove chara otherwise it will be slided out with the flyout as well
					flyout.remove(chara.container);

					picks++;

					chara.unit.position = slot;
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

						slideOutCard(c);

					}

					resolve();
				}

				const handleDrop = async (
					pointer: Phaser.Input.Pointer,
				) => {

					if (state.gameData.player.units.length >= MAX_PARTY_SIZE) {
						addToChest();
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

						occupierChara.unit.position = { ...chara.unit.position };

						tween({
							targets: [occupierChara.container],
							x: occupierChara.unit.position.x * TILE_WIDTH + HALF_TILE_WIDTH,
							y: occupierChara.unit.position.y * TILE_HEIGHT + HALF_TILE_HEIGHT,
						})
					}

					await addCardToBoard(slot);

					// The board has changed: calculate position bonuses for all units
					state.gameData.player.units.forEach((unit) => {
						unit.events.onEnterPosition.forEach(fn => fn(unit)());
					});

				}

				const dragHandler = (pointer: Phaser.Input.Pointer) => {

					chara.container.x = pointer.x;
					chara.container.y = pointer.y;
					Tooltip.hide();
				}

				const dropHandler = (pointer: Pointer) => {

					const wasDrag = pointer.getDistance() > 10;
					const inBoard = overlapsWithPlayerBoard(pointer);

					if (!inBoard && !wasDrag) {
						pick();

						chara.zone.off('drag', dragHandler);
						chara.zone.off('pointerup', dropHandler);
						return
					}
					if (inBoard && wasDrag) {
						handleDrop(pointer);
						chara.zone.off('drag', dragHandler);
						chara.zone.off('pointerup', dropHandler);
						return;
					}

					// go back to original position
					tween({
						targets: [chara.container],
						x: 180 + 250 * index,
						y: 500,
					});

				}

				chara.zone.on('drag', dragHandler);
				chara.zone.on('pointerup', dropHandler);

			});

			const rerollButton = createButton(
				`Reroll (${REROLL_UNITS_PRICE})`,
				400, 700,
				async () => {
					updatePlayerGoldIO(- REROLL_UNITS_PRICE);
					charas.forEach(slideOutCard);

					rerollButton.destroy();

					await delay(scene, 500);
					resolve();
				});
			flyout.add(rerollButton);

			const updateButtonStatus = () => {
				if (state.gameData.player.gold < REROLL_UNITS_PRICE) {
					disableButton(rerollButton);
				} else {
					enableButton(rerollButton);
				}
			}
			updateButtonStatus();

			scene.events.on("gold-changed", updateButtonStatus);

			rerollButton.on("destroy", () => {
				scene.events.off("gold-changed", updateButtonStatus);
			});

			if (allowSkipping) {
				const skipButton = createButton("Skip", 400, 900, () => {
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
		targets: [c.container],
		x: -100,
		onComplete: () => {
			UnitManager.destroyChara(c.id);
		}
	});
}

