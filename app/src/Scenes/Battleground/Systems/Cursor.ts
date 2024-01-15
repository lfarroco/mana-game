import { Chara } from "../../../Components/MapChara";
import { FORCE_ID_PLAYER } from "../../../Models/Force";
import { events, listeners } from "../../../Models/Signals";
import BattlegroundScene from "../BattlegroundScene";
import { TILE_HEIGHT } from "../constants";


type ImageIndex = { [id: string]: Phaser.GameObjects.Image }

const getOrCreateCursor_ = (
	cursors: ImageIndex,
) => (chara: Chara) => {

	if (cursors[chara.id]) return cursors[chara.id]

	const cursor = chara.sprite.scene.add.image(0, 0, 'cursor')
		.setTint(
			chara.force === FORCE_ID_PLAYER ?
				0x00ff00 : 0xff0000
		)
		.setVisible(false)

	chara.sprite.scene.children.moveBelow(cursor, chara.sprite)

	cursors[chara.id] = cursor

	return cursor
}

export function init(scene: BattlegroundScene) {

	let cursors: ImageIndex = {}

	let eventListeners: { [id: string]: (squadId: string) => void } = {}

	listeners([
		[events.SQUAD_SELECTED, (squadId: string) => {

			clearCursors(cursors, eventListeners, scene);

			selectSquad(scene, squadId, cursors, eventListeners)

		}],
		[events.MULTIPLE_SQUADS_SELECTED, (squadIds: string[]) => {

			clearCursors(cursors, eventListeners, scene);

			squadIds.forEach(squadId => selectSquad(scene, squadId, cursors, eventListeners))

		}],
		[events.SQUAD_DESTROYED, (squadId: string) => {

			const cursor = cursors[squadId]
			if (!cursor) return
			cursor.destroy()
		}]
	])

}

function clearCursors(cursors: ImageIndex, eventListeners: { [id: string]: (squadId: string) => void; }, scene: BattlegroundScene) {
	Object.values(cursors).forEach(cursor => cursor.setVisible(false));
	Object.values(eventListeners).forEach(listener => scene.events.off("update", listener));
}

function selectSquad(
	scene: BattlegroundScene,
	squadId: string,
	cursors: ImageIndex,
	eventListeners: { [id: string]: (squadId: string) => void; },
) {

	const getOrCreateCursor = getOrCreateCursor_(cursors)

	const squad = scene.state.squads.find(sqd => sqd.id === squadId)
	if (!squad) {
		console.warn("squad not found", squadId)
		return
	}

	const chara = scene.charas.find(c => c.id === squadId)
	if (!chara) throw new Error("chara not found")

	const cursor = getOrCreateCursor(chara)

	cursor.setVisible(true)

	setListener(
		() => {
			cursor.x = chara.sprite.x;
			cursor.y = chara.sprite.y + TILE_HEIGHT / 4;
		},
		chara,
		eventListeners,
	);

}
function setListener(
	event: () => void,
	chara: Chara,
	eventListeners: { [id: string]: (squadId: string) => void; },
) {

	chara.sprite.scene.events.on("update", event);

	eventListeners[chara.id] = event;
}
