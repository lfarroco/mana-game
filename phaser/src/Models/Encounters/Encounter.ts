import { summonEffect } from "../../Effects";
import { TILE_HEIGHT, TILE_WIDTH } from "../../Scenes/Battleground/constants";
import { Choice, displayChoices, displayStore, newChoice } from "../../Scenes/Battleground/Systems/Choice";
import { destroyChara, renderChara } from "../../Scenes/Battleground/Systems/UnitManager";
import { pickRandom } from "../../utils";
import { FORCE_ID_PLAYER, playerForce } from "../Force";
import { vec2 } from "../Geometry";
import { JobId, starterJobs } from "../Job";
import { emit, signals } from "../Signals";
import { getState, State, getGuildUnit } from "../State";
import { randomCategoryTrait } from "../Traits";
import { Unit } from "../Unit";
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
		type: "nested",
		choices: () => {
			const playerJobs = playerForce.units.map(u => u.job);
			const remaning = starterJobs.filter(j => !playerJobs.includes(j.id));

			return pickRandom(remaning, 3).map(job => newChoice(
				`${job.id}/full`,
				job.name,
				job.description,
				job.id,
			));
		},
		onChoose: (state, choice) => {
			emit(signals.ADD_UNIT_TO_GUILD, FORCE_ID_PLAYER, choice.value as JobId);
			// testing: add random traits
			const { units } = state.gameData.player;
			const trait = randomCategoryTrait("attack")
			units[units.length - 1].traits.push(trait.id)
			const trait2 = randomCategoryTrait("attack")
			units[units.length - 1].traits.push(trait2.id)
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

	if (event.triggers.type === "nested") {

		const choice = await displayChoices(event.triggers.choices());
		event.triggers.onChoose?.(state, choice);
	}

	if (event.triggers.type === "instant") {
		await event.triggers.action(scene, state);
	}

	if (event.triggers.type === "shop") {
		await displayStore(event.triggers.choices());
	}

	if (event.triggers.type === "unit") {

		const unit = await selectUnit();

		await event.triggers.onChoose(scene, state, unit);
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
	const dropZoneHeight = TILE_HEIGHT * 5;
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
		renderChara(unit);

		scene.input.off('drop', listener);

		dropZoneDisplay.destroy();
		dropZone.destroy();

		resolve(unit);
	}

	scene.input.on('drop', listener);

});

