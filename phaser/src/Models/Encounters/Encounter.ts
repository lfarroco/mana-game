import { Choice, displayChoices, newChoice } from "../../Scenes/Battleground/Systems/Choice";
import { itemShop } from "../../Scenes/Battleground/Systems/ItemShop";
import * as UnitManager from "../../Scenes/Battleground/Systems/UnitManager";
import * as Chara from "../../Systems/Chara/Chara";
import * as Tooltip from "../../Systems/Tooltip";
import { pickRandom } from "../../utils";
import { delay, tween } from "../../Utils/animation";
import { playerForce } from "../Force";
import { eqVec2, Vec2, vec2 } from "../Geometry";
import { Item } from "../Item";
import { CardId, starterCards } from "../Card";
import { getState, State } from "../State";
import { getEmptySlot, overlapsWithPlayerBoard } from "../Board";
import { makeUnit } from "../Unit";
import commonEvents from "./common";
import monsterEvents from "./monster";
import * as Flyout from "../../Systems/Flyout";
import { getTileAt } from "../../Scenes/Battleground/Systems/GridSystem";
import { HALF_TILE_HEIGHT, HALF_TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH } from "../../Scenes/Battleground/constants";
import * as Chest from "../../Scenes/Battleground/Systems/Chest";

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
		totalPicks: 2,
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

			charas.forEach(async (chara, index) => {
				await delay(scene, 100 + (150 * index));

				await tween({
					targets: [chara.container],
					x: 180 + 250 * index,
				});

				UnitManager.addCharaToState(chara);

				chara.zone.setInteractive({ draggable: true });

				Chara.addTooltip(chara);

				const pick = async () => {

					Tooltip.hide();

					if (state.gameData.player.units.length >= 5) {

						state.gameData.player.bench.push(chara.unit);
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
							})

							UnitManager.destroyChara(c.id);

						}


						resolve();
						return;
					}

					const emptySlot = getEmptySlot(playerForce.units, playerForce.id);

					if (!emptySlot) throw new Error("No empty slot found");

					addCardToBoard(emptySlot);
				}

				const addCardToBoard = async (slot: Vec2) => {

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

						tween({
							targets: [c.container],
							x: -100,
						})

						UnitManager.destroyChara(c.id);

					}

					resolve();
				}

				const handleDrop = async (
					pointer: Phaser.Input.Pointer,
				) => {

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
					console.log("drag handler")

					chara.container.x = pointer.x;
					chara.container.y = pointer.y;
					Tooltip.hide();
				}

				const dropHandler = (pointer: Pointer) => {

					console.log("drop handler")

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

		});
	}

	await flyout.slideOut();
	await delay(scene, 500);
	flyout.destroy();
}

