import { DIRECTIONS, Direction, getDirection } from "../../Models/Direction";
import { BoardVec, boardVec } from "../../Models/Misc";
import { listeners, events, emit_ } from "../../Models/Signals";
import { SQUAD_STATUS } from "../../Models/Squad";
import { State } from "../../Models/State";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { HALF_TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH } from "../../Scenes/Battleground/constants";
import { removeEmote } from "../../Components/chara";
import * as uuid from "uuid"

export type Engagement = {
	id: string,
	finished: boolean;
	startTick: number;
	endTick: number;
	attacker: string;
	defender: string;
	sprite: Phaser.GameObjects.Sprite,
	log: string[]
}

export function init(scene: BattlegroundScene, state: State) {

	listeners([
		[events.ENGAGEMENT_START, engagementStartHandler(scene, state)]
	])

}

const engagementStartHandler = (scene: BattlegroundScene, state: State) => (squadId: string, targetCell: BoardVec) => {

	const squad = state.squads.find(squad => squad.id === squadId);

	if (!squad) {
		throw new Error(`Squad ${squadId} not found`)
	}

	const isAlreadyEngaged = state.engagements.some(engagement =>
		!engagement.finished &&
		(engagement.attacker === squadId || engagement.defender === squadId)
	);

	if (isAlreadyEngaged) {
		console.warn(`Squad ${squadId} is already engaged`)
		return
	}

	const targetCellEnemies = state.squads
		.filter(sqd =>
			sqd.force !== squad.force &&
			sqd.position.x === targetCell.x && sqd.position.y === targetCell.y
		);


	if (targetCellEnemies.length === 0) {
		throw new Error(`No squads at ${targetCell.x},${targetCell.y}`)
	}

	const direction = getDirection(targetCell, squad.position,)

	const emotePosition = getEmotePosition(targetCell, direction)
	// create sprite between cells
	const sprite = scene.add.sprite(
		emotePosition.x,
		emotePosition.y,
		"combat-emote"
	)
		.setScale(1)
		.play("combat-emote")

	const attacker = squadId;
	const defender = targetCellEnemies[0].id;

	const engagement: Engagement = {
		id: uuid.v4(),
		startTick: state.tick,
		attacker,
		defender,
		endTick: Infinity,
		finished: false,
		sprite,
		log: []
	}

	sprite.setInteractive()
	sprite.on("pointerdown", emit_(events.TOGGLE_ENGAGEMENT_WINDOW, true, engagement.id))

	targetCellEnemies.forEach(squad => squad.status = SQUAD_STATUS.ENGAGED)
	state.engagements.push(engagement);

	[attacker, defender].forEach(member => {
		const chara = scene.charas.find(c => c.id === member)
		if (!chara) return;
		removeEmote(chara)
	})

}
const getEmotePosition = (tile: { x: number, y: number }, direction: Direction) => {
	switch (direction) {
		case DIRECTIONS.up:
			return { x: tile.x * TILE_WIDTH + HALF_TILE_WIDTH, y: (tile.y + 1) * TILE_HEIGHT }
		case DIRECTIONS.down:
			return { x: tile.x * TILE_WIDTH + HALF_TILE_WIDTH, y: (tile.y) * TILE_HEIGHT }
		case DIRECTIONS.left:
			return { x: (tile.x + 1) * TILE_WIDTH, y: (tile.y) * TILE_HEIGHT }
		case DIRECTIONS.right:
			return { x: (tile.x) * TILE_WIDTH - HALF_TILE_WIDTH, y: (tile.y) * TILE_HEIGHT }
	}
	throw new Error(`Invalid direction ${direction}`)
}
