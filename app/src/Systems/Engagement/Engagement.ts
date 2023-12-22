import { BoardVec } from "../../Models/Misc";
import { listeners, events } from "../../Models/Signals";
import { State } from "../../Models/State";

type Engagement = {
	startTick: number;
	members: { id: string, cell: { x: number, y: number } }[]
}

export function init(state: State) {

	let engagements: Engagement[] = []

	listeners([
		[events.ENGAGEMENT_START, engagementStartHandler(state, engagements)]
	])

	//@ts-ignore
	window.engagements = engagements;

}

const engagementStartHandler = (state: State, engagements: Engagement[]) => (squadId: string, targetCell: BoardVec) => {

	const squad = state.squads.find(squad => squad.id === squadId);

	if (!squad) {
		throw new Error(`Squad ${squadId} not found`)
	}

	const isAlreadyEngaged = engagements.some(engagement => engagement.members.some(member => member.id === squadId));

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
		cell: squad.position
	}].concat(targetCellEnemies.map(squad => ({
		id: squad.id,
		cell: squad.position
	})))

	const engagement: Engagement = {
		startTick: state.tick,
		members
	}

	squad.engaged = true
	targetCellEnemies.forEach(squad => squad.engaged = true)
	engagements.push(engagement);

}