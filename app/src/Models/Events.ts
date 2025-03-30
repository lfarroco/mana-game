import { summonEffect } from "../Effects";
import { TILE_HEIGHT, TILE_WIDTH } from "../Scenes/Battleground/constants";
import { Choice, displayChoices, displayStore, newChoice } from "../Scenes/Battleground/Systems/Choice";
import * as UIManager from "../Scenes/Battleground/Systems/UIManager";
import { destroyChara, renderUnit } from "../Scenes/Battleground/Systems/UnitManager";
import { createWave } from "../Scenes/Battleground/Systems/WaveManager";
import { popText } from "../Systems/Chara/Animations/popText";
import { pickRandom } from "../utils";
import { delay } from "../Utils/animation";
import { Force, FORCE_ID_PLAYER } from "./Force";
import { vec2 } from "./Geometry";
import { JobId, jobs, starterJobs } from "./Job";
import { emit, signals } from "./Signals";
import { getPlayerForce, getState, getUnit, randomPlayerUnit, State } from "./State";
import { Unit } from "./Unit";

let scene: Phaser.Scene;
export let state: State;
let player: Force;

export const init = (s: Phaser.Scene) => {
	scene = s;
	state = getState();
	player = getPlayerForce(state);
}

export type Event = {
	id: string;
	day: number;
	title: string;
	description: string;
	/* a prompt used to generate the event's icon */
	prompt?: string;
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
	} | {
		type: "unit"
		onChoose: (unit: Unit) => void;
	}

}

/**
 * Creates a nested trigger with choices
 * @param choicesFn Function that returns the available choices
 * @param onChoiceFn Function called when a choice is made
 */
function nestedTrigger(choicesFn: () => Choice[], onChoiceFn: (choice: Choice) => void) {
	return {
		type: "nested" as const,
		choices: choicesFn,
		onChoice: onChoiceFn
	};
}

/**
 * Creates an instant trigger
 * @param onSelectFn Function called when the event is selected
 */
function instantTrigger(onSelectFn: () => void) {
	return {
		type: "instant" as const,
		onSelect: onSelectFn
	};
}

/**
 * Creates a shop trigger
 * @param choicesFn Function that returns the available shop items
 */
function shopTrigger(choicesFn: () => Choice[]) {
	return {
		type: "shop" as const,
		choices: choicesFn
	};
}

/**
 * Creates a unit trigger
 * @param onChooseFn Function called when a unit is chosen
 */
function unitTrigger(onChooseFn: (unit: Unit) => void) {
	return {
		type: "unit" as const,
		onChoose: onChooseFn
	};
}

export const starterEvent: Event = {
	id: "1",
	day: 1,
	title: "Start your guild",
	description: "Recruit the founding members of your guild",
	pic: "icon/quest",
	triggers: nestedTrigger(
		() => {

			const remaning = starterJobs.filter(j => !state.gameData.units.find(f => f.job === j.id));

			return pickRandom(remaning, 3).map(job => newChoice(
				`${job.id}/full`,
				job.name,
				job.description,
				job.id,
			));
		},
		async (choice: Choice) => {
			emit(signals.ADD_UNIT_TO_GUILD, FORCE_ID_PLAYER, choice.value as JobId);
		})
}


const randomEvents: Event[] = [
	{
		id: "2",
		day: 1,
		title: "Odd Job",
		description: "You have been offered a job for 5 gold",
		prompt: "a small bag of gold coins and a scroll with a job contract",
		pic: "icon/job_contract",
		triggers: instantTrigger(() => {
			const playerForce = state.gameData.forces.find(f => f.id === FORCE_ID_PLAYER)!;
			playerForce.gold += 5;
			UIManager.updateUI();
		}),
	},
	{
		id: "3",
		day: 1,
		title: "A new friend",
		description: "You have made a new friend",
		pic: "icon/quest",
		prompt: "a cute friendly green blob character, glowing with blue light, smiling",
		triggers: instantTrigger(() => {
			emit(signals.ADD_UNIT_TO_GUILD, FORCE_ID_PLAYER, "blob" as JobId);
		})
	},
	{
		id: "4",
		day: 1,
		title: "Pick some fruit",
		description: "Get a random fruit",
		prompt: "a basket of fruits",
		pic: "icon/fruits",
		triggers: instantTrigger(() => {
			const playerForce = state.gameData.forces.find(f => f.id === FORCE_ID_PLAYER)!;
			playerForce.gold += 33;
			UIManager.updateUI();
		})
	},
	{
		id: "5",
		day: 1,
		title: "Market Day",
		description: "A traveling merchant offers special goods at reduced prices",
		prompt: "an old and plump male merchant with a cart full of goods like armors, staves, swords, trinkets. in a market",
		pic: "icon/quest",
		triggers: shopTrigger(
			() => {
				return [
					newChoice("icon/quest", "Buy Equipment", "Upgrade your guild's gear (+5 attack)", "test_item_1"),
					newChoice("icon/quest", "Buy Potions", "Stock up on healing supplies (+10 health)", "test_item_2"),
					newChoice("icon/quest", "Buy Chocolate", "Treat yourself to a sweet snack", "test_item_3")
				];
			})
	},
	{
		id: "6",
		day: 2,
		title: "Endurance Training",
		description: "Make a guild member gain 30 HP",
		prompt: "a training ground with a guild member lifting weights",
		pic: "icon/endurance_training",
		triggers: unitTrigger(
			async (unit) => {

				unit.maxHp += 30;
				unit.hp = unit.maxHp;

				popText(scene, "+30 HP", unit.id, "heal");
				await delay(scene, 1000 / state.options.speed);

			})
	},
	{
		id: "7",
		day: 1,
		title: "Lost Treasure",
		description: "You stumble upon a hidden chest in the forest",
		prompt: "an old wooden chest with a rusty lock, surrounded by trees and bushes",
		pic: "icon/hidden_treasure",
		triggers: instantTrigger(
			() => {
				player.gold += 10;
				UIManager.updateUI();
			}
		)
	},
	{
		id: "8",
		day: 2,
		title: "Mysterious Stranger",
		description: "A cloaked figure approaches your guild hall",
		pic: "icon/quest",
		triggers: nestedTrigger(
			() => {
				return [
					newChoice("recruit", "Recruit Them", "Invite the stranger to join your guild", "recruit"),
					newChoice("bribe", "Bribe for Info", "Pay 5 gold for valuable information", "bribe"),
					newChoice("ignore", "Turn Away", "You don't trust mysterious figures", "ignore")
				];
			},
			(choice: Choice) => {
				if (choice.value === "recruit") {
					emit(signals.ADD_UNIT_TO_GUILD, FORCE_ID_PLAYER, pickRandom(jobs, 1)[0].id as JobId);
				} else if (choice.value === "bribe" && player.gold >= 5) {
					player.gold += 10; // Information leads to greater reward
					UIManager.updateUI();
				}
			})
	},
	{
		id: "12",
		day: 1,
		title: "Investment Opportunity",
		description: "A merchant offers you a chance to invest in their business, increasing your guild's income.",
		pic: "icon/quest",
		triggers: instantTrigger(() => {
			player.income += 2;
			UIManager.updateUI();
		}),
	},
	{
		id: "13",
		day: 2,
		title: "Mysterious Shrine",
		description: "You discover an ancient shrine with strange inscriptions",
		pic: "icon/quest",
		triggers: nestedTrigger(
			() => {
				return [
					newChoice("shrine", "Make an Offering", "Sacrifice 10 gold for unknown blessings", "offering"),
					newChoice("shrine", "Touch the Relic", "Something might happen to one of your guild members", "touch"),
					newChoice("shrine", "Leave it Alone", "It's safer not to meddle with unknown forces", "leave")
				];
			},
			(choice: Choice) => {
				const playerForce = state.gameData.forces.find(f => f.id === FORCE_ID_PLAYER)!;
				if (choice.value === "offering" && playerForce.gold >= 10) {

					playerForce.gold -= 10;
					const randomUnit = randomPlayerUnit(state);
					const effect = Math.floor(Math.random() * 4);
					if (effect === 0) {
						randomUnit.attack += 7; // Increased attack power
					} else if (effect === 1) {
						randomUnit.maxHp += 25; // Enhanced vitality
						randomUnit.hp += 25;
					} else if (effect === 2) {
						randomUnit.agility += 3; // Improved reflexes
					} else {
						// Balanced blessing
						randomUnit.attack += 3;
						randomUnit.maxHp += 10;
						randomUnit.hp += 10;
						randomUnit.agility += 1;
					}
					// Visual effect could be added here if needed


					UIManager.updateUI();
				} else if (choice.value === "touch") {
					const randomUnit = randomPlayerUnit(state);
					if (randomUnit) {
						const effect = Math.floor(Math.random() * 3);
						if (effect === 0) {
							randomUnit.attack += 5; // Strength blessing
						} else if (effect === 1) {
							randomUnit.maxHp += 15; // Health blessing
							randomUnit.hp += 15;
						} else {
							randomUnit.attack -= 2; // Curse
							randomUnit.attack = Math.max(1, randomUnit.attack);
						}
					}
				}
			}
		)
	},
	{
		id: "14",
		day: 1,
		title: "The Tavern",
		description: "A rowdy tavern full of potential recruits and rumors",
		pic: "icon/quest",
		triggers: nestedTrigger(
			() => {
				return [
					newChoice("tavern", "Hire Mercenary", "Pay 15 gold to recruit a seasoned warrior", "mercenary"),
					newChoice("tavern", "Buy a Round of Drinks", "Spend 5 gold to hear valuable rumors", "rumors"),
					newChoice("tavern", "Join the Card Game", "Gamble 8 gold for a chance to win more", "gamble")
				];
			},
			(choice: Choice) => {
				const playerForce = state.gameData.forces.find(f => f.id === FORCE_ID_PLAYER)!;
				if (choice.value === "mercenary" && playerForce.gold >= 15) {
					playerForce.gold -= 15;
					const randomJob = pickRandom(jobs, 1)[0];
					// TODO: limit tier
					emit(signals.ADD_UNIT_TO_GUILD, FORCE_ID_PLAYER, randomJob.id);
					UIManager.updateUI();
				} else if (choice.value === "rumors" && playerForce.gold >= 5) {
					playerForce.gold -= 5;
					playerForce.income += 3;
					UIManager.updateUI();
				} else if (choice.value === "gamble" && playerForce.gold >= 8) {
					playerForce.gold -= 8;
					if (Math.random() < 0.4) {
						playerForce.gold += 20;
					}
					UIManager.updateUI();
				}
			}
		)
	},
	{
		id: "15",
		day: 2,
		title: "Enchanted Forest",
		description: "Your guild stumbles upon a magical forest with strange properties",
		pic: "icon/quest",
		triggers: instantTrigger(() => {
			const randomUnit = randomPlayerUnit(state);
			if (randomUnit) {
				randomUnit.attack += 3;
				randomUnit.maxHp += 10;
				randomUnit.hp += randomUnit.maxHp;
			}
			UIManager.updateUI();
		})
	},
	{
		id: "16",
		day: 3,
		title: "Arcane Library",
		description: "An ancient repository of magical knowledge",
		pic: "icon/quest",
		triggers: unitTrigger(
			async (unit) => {
				// Give the unit a significant power boost
				unit.attack += 8;
				unit.agility += 2;

				popText(scene, "+8 ATK +2 AGI", unit.id, "heal");

				await delay(scene, 1000 / state.options.speed);
			}
		)
	},
	{
		id: "17",
		day: 2,
		title: "Cursed Idol",
		description: "Your guild discovers a valuable but possibly cursed artifact",
		pic: "icon/quest",
		triggers: nestedTrigger(
			() => {
				return [
					newChoice("idol", "Take the Idol", "Risk the curse for great power", "take"),
					newChoice("idol", "Sell to Collector", "Gain 20 gold safely", "sell"),
					newChoice("idol", "Leave it Alone", "Better safe than sorry", "leave")
				];
			},
			(choice: Choice) => {
				const playerForce = state.gameData.forces.find(f => f.id === FORCE_ID_PLAYER)!;
				if (choice.value === "take") {

					if (Math.random() < 0.5) {
						// Curse - reduce all units' HP slightly
						state.gameData.units.filter(u => u.force === FORCE_ID_PLAYER).forEach(u => {
							u.hp = Math.max(1, u.hp - 5);
						});
					} else {
						// Blessing - increase all units' attack
						state.gameData.units.filter(u => u.force === FORCE_ID_PLAYER).forEach(u => {
							u.attack += 2;
						});
					}
				} else if (choice.value === "sell") {
					playerForce.gold += 20;
					UIManager.updateUI();
				}
			}
		)
	}
];

const monsterEvents: Event[] = [
	{
		id: "9",
		day: 1,
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
		day: 2,
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
		day: 3,
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

	if (event.triggers.type === "unit") {

		const unit = await selectUnit();

		await event.triggers.onChoose(unit);
	}

	return true;

}

const displayEvents = async (eventArray: Event[], day: number) => {
	const randomItems = pickRandom(eventArray, 3);
	const chosenEvent = await displayChoices(
		randomItems.map(e => newChoice(e.pic, e.title, e.description, e.id))
	);

	const event = events.find(e => e.id === chosenEvent.value);
	if (!event) throw new Error("Event not found");

	return evalEvent(event);
}

export const displayRandomEvents = (day: number) => displayEvents(randomEvents, day);
export const displayMonsterEvents = (day: number) => displayEvents(monsterEvents, day);

const selectUnit = async () => new Promise<Unit>((resolve) => {
	const dropZoneX = TILE_WIDTH * 3;
	const dropZoneY = TILE_HEIGHT * 3;
	const dropZone = scene.add.zone(dropZoneX, dropZoneY, TILE_WIDTH, TILE_HEIGHT)
		.setRectangleDropZone(TILE_WIDTH, TILE_HEIGHT)
		.setName('selectUnit')
		.setOrigin(0);

	const dropZoneDisplay = scene.add.graphics();
	dropZoneDisplay.lineStyle(2, 0xffff00);
	dropZoneDisplay.fillStyle(0x00ffff, 0.3);
	dropZoneDisplay.fillRect(dropZoneX, dropZoneY, TILE_WIDTH, TILE_HEIGHT);
	dropZoneDisplay.strokeRect(dropZoneX, dropZoneY, TILE_WIDTH, TILE_HEIGHT);
	scene.tweens.add({
		targets: dropZoneDisplay,
		alpha: 0.1,
		duration: 2000,
		repeat: -1,
		yoyo: true
	});

	const listener = (
		pointer: Phaser.Input.Pointer,
		gameObject: Phaser.GameObjects.GameObject,
		droppedZone: Phaser.GameObjects.Zone,
	) => {

		if (droppedZone.name !== 'selectUnit') return;

		const unitId = gameObject.name;

		destroyChara(unitId);

		summonEffect(scene, 2, vec2(TILE_WIDTH * 3 + TILE_WIDTH / 2, TILE_HEIGHT * 3 + TILE_HEIGHT / 2));

		const unit = getUnit(state)(unitId);
		renderUnit(unit);

		scene.input.off('drop', listener);

		dropZoneDisplay.destroy();
		dropZone.destroy();

		resolve(unit);

	}

	scene.input.on('drop', listener);

});

