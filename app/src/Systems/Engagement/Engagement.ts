import { DIRECTIONS, Direction, getDirection } from "../../Models/Direction";
import { Vec2, eqVec2 } from "../../Models/Geometry";
import { listeners, events, emit_, emit } from "../../Models/Signals";
import { SQUAD_STATUS } from "../../Models/Squad";
import { State } from "../../Models/State";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { HALF_TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH } from "../../Scenes/Battleground/constants";
import { removeEmote } from "../../Components/Chara";
import * as uuid from "uuid"

export type Engagement = {
	id: string,
	finished: boolean;
	startTick: number;
	endTick: number;
	attacker: {
		id: string;
		buffs: string[];
	};
	defender: {
		id: string;
		buffs: string[];
	};
	sprite: Phaser.GameObjects.Sprite,
	log: string[]
}

export function init(scene: BattlegroundScene, state: State) {

	listeners([
		[events.ENGAGEMENT_START, engagementStartHandler(scene, state)],
		[events.FINISH_ENGAGEMENT, engagementFinishHandler(state)],
	])

}

const engagementStartHandler = (scene: BattlegroundScene, state: State) => (attackerId: string, targetCell: Vec2) => {

	const attacker = state.squads.find(squad => squad.id === attackerId);

	if (!attacker) {
		throw new Error(`Squad ${attackerId} not found`)
	}

	const isAlreadyEngaged = state.engagements.some(engagement =>
		!engagement.finished &&
		(engagement.attacker.id === attackerId || engagement.defender.id === attackerId)
	);

	if (isAlreadyEngaged) {
		console.warn(`Squad ${attackerId} is already engaged`)
		return
	}

	const targetCellEnemies = state.squads
		.filter(sqd =>
			sqd.force !== attacker.force &&
			eqVec2(sqd.position, targetCell) &&
			sqd.status !== SQUAD_STATUS.RETREATING
		);

	if (targetCellEnemies.length === 0) {
		throw new Error(`No squads at ${targetCell.x},${targetCell.y}`)
	}

	const direction = getDirection(targetCell, attacker.position,)

	const emotePosition = getEmotePosition(targetCell, direction)
	// create sprite between cells
	const sprite = scene.add.sprite(
		emotePosition.x,
		emotePosition.y,
		"combat-emote"
	)
		.setScale(1)
		.play("combat-emote")

	const nonEngaged = targetCellEnemies.filter(sqd => sqd.status !== SQUAD_STATUS.ENGAGED)

	const defender = nonEngaged.length > 0 ?
		nonEngaged.sort((a, b) => b.morale - a.morale)[0] :
		targetCellEnemies.sort((a, b) => b.morale - a.morale)[0]


	const defenderTileType = state.cities.find(city => eqVec2(city.boardPosition, targetCell))?.type
	const isFortified = defenderTileType === "castle" || defenderTileType === "fort"
	const fortifiedBuff = isFortified ? ["fortified"] : []

	const defenderEngagements = state.engagements.filter(engagement =>
		engagement.defender.id === defender.id || engagement.attacker.id === defender.id
	)
	const isFlanked = defenderEngagements.length > 0
	const flankedBuff = isFlanked ? ["flanked"] : []

	const attackerEngagements = state.engagements.filter(engagement =>
		engagement.defender.id === attacker.id || engagement.attacker.id === attacker.id
	)
	const isSurrounded = attackerEngagements.length > 0
	const attackerFlankedBuff = isSurrounded ? ["flanked"] : []


	const engagement: Engagement = {
		id: uuid.v4(),
		startTick: state.tick,
		attacker:
		{
			id: attacker.id,
			buffs: ([] as string[]).concat(attackerFlankedBuff)
		},
		defender: {
			id: defender.id,
			buffs: ([] as string[]).concat(fortifiedBuff).concat(flankedBuff)
		},
		endTick: Infinity,
		finished: false,
		sprite,
		log: []
	}

	sprite.setInteractive()
	sprite.on("pointerdown", emit_(events.TOGGLE_ENGAGEMENT_WINDOW, true, engagement.id))

	state.engagements.push(engagement);

	[attacker, defender].forEach(member => {
		const chara = scene.charas.find(c => c.id === member.id)
		if (!chara) return;
		removeEmote(chara)
		if (member.status !== SQUAD_STATUS.ENGAGED) {
			emit(events.UPDATE_SQUAD, member.id, { status: SQUAD_STATUS.ENGAGED })
		}
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
function engagementFinishHandler(state: State): ((id: string) => void) {
	return (id: string) => {
		const engagement = state.engagements.find(e => e.id === id);
		if (!engagement) return;
		engagement.finished = true;
		engagement.sprite?.destroy();
	};
}

