import { Chara } from "../../../Systems/Chara/Chara";
import { FORCE_ID_PLAYER } from "../../../Models/Force";
import { signals, listeners } from "../../../Models/Signals";
import BattlegroundScene from "../BattlegroundScene";
import { TILE_HEIGHT } from "../constants";


// index of cursors for cities and charas
type ImageIndex = { [id: string]: Phaser.GameObjects.Image }

const getOrCreateCursorForChara_ = (
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
		[signals.UNITS_SELECTED, (squadIds: string[]) => {

			squadIds.forEach(squadId =>
				selectSquad(scene, squadId, cursors, eventListeners)
			)

		}],
		[signals.UNITS_DESELECTED, (squadIds: string[]) => {

			squadIds.forEach(id => {
				cleanCursor(cursors, eventListeners, scene, id)

				cursors[id].destroy()

				delete cursors[id]
				delete eventListeners[id]
			})

		}],
		[signals.CITIES_SELECTED, (cityIds: string[]) => {

			cityIds.forEach(cityId => {

				const city = scene.getCity(cityId)

				const cursor = scene.add.image(city.sprite.x, city.sprite.y, 'cursor')
					.setTint(0x00ff00)
					.setVisible(true)

				scene.children.moveBelow(cursor, city.sprite)

				cursors[cityId] = cursor

			})
		}],
		[signals.CITIES_DESELECTED, (cityIds: string[]) => {

			cityIds.forEach(cityId => {
				cursors[cityId].destroy()
				delete cursors[cityId]
			})

		}]
	])

}

//FIXME - there's a bug here when clicking someone after loading a game
function cleanCursor(
	cursors: ImageIndex,
	eventListeners: { [id: string]: (squadId: string) => void; }, scene: BattlegroundScene,
	id: string
) {
	const cursor = cursors[id]
	cursor.setVisible(false)

	const listener = eventListeners[id];
	scene.events.off("update", listener)
}

function selectSquad(
	scene: BattlegroundScene,
	squadId: string,
	cursors: ImageIndex,
	eventListeners: { [id: string]: (squadId: string) => void; },
) {

	const getOrCreateCursor = getOrCreateCursorForChara_(cursors)


	const chara = scene.getChara(squadId)

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
