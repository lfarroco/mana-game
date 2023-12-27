import { Direction, getDirection } from "../../Models/Direction";
import { BoardVec, boardVec } from "../../Models/Misc";
import { listeners, events } from "../../Models/Signals";
import { SQUAD_STATUS } from "../../Models/Squad";
import { State } from "../../Models/State";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { HALF_TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH } from "../../Scenes/Battleground/constants";
import { removeEmote } from "../../Components/chara";

export type Engagement = {
	finished: boolean;
	startTick: number;
	members: { id: string, force: string, cell: { x: number, y: number } }[]
	attackingCell: BoardVec,
	sprite: Phaser.GameObjects.Sprite
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

	const isAlreadyEngaged = state.engagements.some(engagement => engagement.members.some(member => member.id === squadId));

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

	const members = [{
		id: squad.id,
		cell: squad.position,
		force: squad.force
	}].concat(targetCellEnemies.map(sqd => ({
		id: sqd.id,
		force: sqd.force,
		cell: sqd.position
	})))

	const direction = getDirection(targetCell, squad.position,)

	const emotePosition = getEmotePosition(targetCell, direction)
	// create sprite between cells
	const sprite = scene.add.sprite(
		emotePosition.x,
		emotePosition.y,
		"combat-emote"
	)
		.setScale(2)
		.play("combat-emote")

	const engagement: Engagement = {
		startTick: state.tick,
		finished: false,
		attackingCell: boardVec(squad.position.x, squad.position.y),
		members,
		sprite
	}

	targetCellEnemies.forEach(squad => squad.status = SQUAD_STATUS.ENGAGED)
	state.engagements.push(engagement);

	members.forEach(member => {
		const chara = scene.charas.find(c => c.id === member.id)
		if (!chara) return;
		removeEmote(chara)
	})

}
const getEmotePosition = (tile: { x: number, y: number }, direction: Direction) => {
	switch (direction) {
		case "up":
			return { x: tile.x * TILE_WIDTH + HALF_TILE_WIDTH, y: (tile.y + 1) * TILE_HEIGHT }
		case "down":
			return { x: tile.x * TILE_WIDTH + HALF_TILE_WIDTH, y: (tile.y) * TILE_HEIGHT }
		case "left":
			return { x: (tile.x + 1) * TILE_WIDTH, y: (tile.y) * TILE_HEIGHT }
		case "right":
			return { x: (tile.x) * TILE_WIDTH - HALF_TILE_WIDTH, y: (tile.y) * TILE_HEIGHT }
	}
}
