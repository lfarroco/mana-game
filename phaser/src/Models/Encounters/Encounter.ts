import { v4 } from "uuid";
import { summonEffect } from "../../Effects";
import { defaultTextConfig, TILE_HEIGHT, TILE_WIDTH } from "../../Scenes/Battleground/constants";
import { Choice, displayChoices, displayStore, newChoice } from "../../Scenes/Battleground/Systems/Choice";
import { itemShop } from "../../Scenes/Battleground/Systems/ItemShop";
import { addCharaToState, destroyChara, getCharaPosition, summonChara } from "../../Scenes/Battleground/Systems/UnitManager";
import { Chara, createCharaCard } from "../../Systems/Chara/Chara";
import * as Tooltip from "../../Systems/Tooltip";
import { pickRandom } from "../../utils";
import { delay, tween } from "../../Utils/animation";
import { playerForce } from "../Force";
import { vec2 } from "../Geometry";
import { Item } from "../Item";
import { JobId, starterJobs } from "../Job";
import { getState, State, getGuildUnit, getEmptySlot } from "../State";
import { makeUnit, Unit } from "../Unit";
import commonEvents from "./common";
import monsterEvents from "./monster";

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
		type: "nested";
		choices: () => Choice[];
		onChoose: (state: State, choice: Choice) => void;
	} | {
		type: "instant"
		action: (scene: Phaser.Scene, State: State) => void;
	} | {
		type: "shop"
		choices: () => Choice[];
	} | {
		type: "unit"
		onChoose: (scene: Phaser.Scene, state: State, unit: Unit) => void;
	} | {
		type: "pick-card"
		choices: () => Choice[];
		onChoose: (state: State, choice: Choice) => void;
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
		type: "pick-card",
		choices: () => {
			const playerJobs = playerForce.units.map(u => u.job);
			const remaning = starterJobs.filter(j => !playerJobs.includes(j.id));

			return pickRandom(remaning, 3).map(job => newChoice(
				`charas/${job.id}`,
				job.name,
				job.description,
				job.id,
			));
		},
		onChoose: async (state, choice) => {

			console.log(state, choice)
			// const unit = addUnitToGuild(playerForce.id, choice.value as JobId);
			// await renderChara(unit)
			// // testing: add random traits
			// const { units } = state.gameData.player;
			// const trait = randomCategoryTrait(TRAIT_CATEGORY_PERSONALITY)
			// addUnitTrait(trait, units[units.length - 1])
			// const trait2 = randomCategoryTrait(TRAIT_CATEGORY_DEFENSIVE)
			// addUnitTrait(trait2, units[units.length - 1])
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
		case "nested":
			const choice = await displayChoices(event.triggers.choices());
			event.triggers.onChoose?.(state, choice);
			break
		case "instant":
			await event.triggers.action(scene, state);
			break;
		case "shop":
			await displayStore(event.triggers.choices());
			break;
		case "unit":
			const unit = await selectUnit();
			await event.triggers.onChoose(scene, state, unit);
			break;
		case "pick-card":
			const card = await pickCard(event.triggers.choices());
			event.triggers.onChoose(state, card);
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

const selectUnit = async () => new Promise<Unit>((resolve) => {
	const dropZoneX = TILE_WIDTH * 1;
	const dropZoneY = TILE_HEIGHT * 1;
	const dropZoneWidth = TILE_WIDTH * 4;
	const dropZoneHeight = TILE_HEIGHT * 3;
	const dropZone = scene.add.zone(dropZoneX, dropZoneY, TILE_WIDTH, TILE_HEIGHT)
		.setRectangleDropZone(dropZoneWidth, dropZoneHeight)
		.setName('selectUnit')
		.setOrigin(0);

	const dropZoneDisplay = scene.add.graphics();
	dropZoneDisplay.lineStyle(2, 0xffff00);
	dropZoneDisplay.fillStyle(0x00ffff, 0.3);
	dropZoneDisplay.fillRect(dropZoneX, dropZoneY, dropZoneWidth, dropZoneHeight);
	dropZoneDisplay.strokeRect(dropZoneX, dropZoneY, dropZoneWidth, dropZoneHeight);
	scene.tweens.add({
		targets: dropZoneDisplay,
		alpha: 0.1,
		duration: 2000,
		repeat: -1,
		yoyo: true
	});

	const listener = (
		_pointer: Phaser.Input.Pointer,
		gameObject: Phaser.GameObjects.GameObject,
		droppedZone: Phaser.GameObjects.Zone,
	) => {

		if (droppedZone.name !== 'selectUnit') return;

		const unitId = gameObject.name;

		destroyChara(unitId);

		summonEffect(scene, 2, vec2(TILE_WIDTH * 3 + TILE_WIDTH / 2, TILE_HEIGHT * 3 + TILE_HEIGHT / 2));

		const unit = getGuildUnit(state)(unitId)!;
		summonChara(unit);

		scene.input.off('drop', listener);

		dropZoneDisplay.destroy();
		dropZone.destroy();

		resolve(unit);
	}

	scene.input.on('drop', listener);

});

const pickCard = (choices: Choice[]) => new Promise<Choice>(async (resolve) => {

	const bg = scene.add.image(0, 0, "ui/wood_texture").setOrigin(0);
	bg.setDisplaySize(900, scene.cameras.main.height);
	bg.setPosition(-400, 0);

	await tween({
		targets: [bg],
		x: 0,
		duration: 500,
		ease: "Power2",
	});

	const title = scene.add.text(200, 50, "Choose a Starting Hero", defaultTextConfig).setFontSize(40).setAlpha(0);

	tween({
		targets: [title],
		alpha: 1,
		duration: 500,
		ease: "Power2",
	});

	let charas: Chara[] = [];

	for (const choice of choices) {
		const chara = await createCharaCard(

			makeUnit(v4(), playerForce.id, choice.value as JobId, vec2(0, 1)),
		)

		chara.container.setPosition(-100, 500);
		charas.push(chara);
	}

	charas.forEach(async (chara, i) => {
		const x = chara.container.x;

		await delay(scene, 200 + (250 * i));

		await tween({
			targets: [chara.container],
			x: x + 250 + (250 * i),
			duration: 1500 / getState().options.speed,
			ease: "Power2",
		})

		addCharaToState(chara);

		chara.zone.once('pointerup', async () => {

			Tooltip.hide();

			const emptySlot = getEmptySlot(state);

			chara.unit.position = emptySlot
			state.gameData.player.units.push(chara.unit);

			tween({
				targets: [bg],
				x: -900,
				duration: 500,
				onComplete: () => {
					bg.destroy();
				}
			})

			title.destroy();

			for (const c of charas) {

				if (chara.id === c.id) {
					const pos = getCharaPosition(c.unit);
					tween({
						targets: [c.container],
						...pos,
						duration: 500,
					})
					continue;
				};

				tween({
					targets: [c.container],
					x: -100,
					duration: 500,
					ease: "Power2",
					onComplete: () => {
						destroyChara(c.id);
					}
				})

			}

			await delay(scene, 500);

			resolve(choices[i]);
		});

	});
});

