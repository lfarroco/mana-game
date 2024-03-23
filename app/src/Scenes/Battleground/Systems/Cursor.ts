import { Chara } from "../../../Systems/Chara/Chara";
import { FORCE_ID_PLAYER } from "../../../Models/Force";
import { signals, listeners } from "../../../Models/Signals";
import BattlegroundScene from "../BattlegroundScene";
import { TILE_HEIGHT } from "../constants";
import { State } from "../../../Models/State";


// index of cursors for cities and charas
type ImageIndex = { [id: string]: Phaser.GameObjects.Image }

type TweenIndex = { [id: string]: Phaser.Tweens.Tween }

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
		.setScale(0.8);

	chara.sprite.scene.children.moveBelow(cursor, chara.sprite)

	cursors[chara.id] = cursor

	return cursor
}

export function init(state: State, scene: BattlegroundScene) {

	let cursors: ImageIndex = {}
	let tweens: TweenIndex = {}

	let eventListeners: { [id: string]: (unitId: string) => void } = {}

	listeners([
		[signals.CHARA_CREATED, (unitId: string) => {

			renderCursor(scene, unitId, cursors, eventListeners)

		}],
		[signals.UNIT_SELECTED, (id: string) => {

			const cursor = cursors[id]

			if (!cursor) return

			const tween = scene.tweens.add({
				targets: cursor,
				alpha: 0.1,
				duration: 200,
				yoyo: true,
				repeat: -1
			});

			tweens[id] = tween
		}],
		[signals.UNIT_DESELECTED, (id: string) => {

			const cursor = cursors[id]

			if (!cursor) return

			scene.tweens.killTweensOf(cursor)

			cursor.setAlpha(1);

			tweens[id].destroy()
			delete tweens[id]

		}],
		[signals.CITY_SELECTED, (cityId: string | null) => {

			if (cityId === null) {

				state.gameData.cities.forEach(city => {
					const cursor = cursors[city.id]
					if (!cursor) return
					cursors[city.id].destroy()
					delete cursors[city.id]
				});

				return

			}

			const city = scene.getCity(cityId)

			const cursor = scene.add.image(
				city.sprite.x,
				city.sprite.y + TILE_HEIGHT / 4,
				'cursor',
			)
				.setTint(0x00ff00)
				.setVisible(true)

			scene.children.moveBelow(cursor, city.sprite)

			scene.tweens.add({
				targets: cursor,
				alpha: 0.1,
				duration: 200,
				yoyo: true,
				repeat: -1
			});

			cursors[cityId] = cursor

		}],
		[signals.CITY_DESELECTED, () => {

			const id = state.gameData.selectedCity

			if (!id) return

			cursors[id].destroy()
			delete cursors[id]

		}],
		[signals.UNIT_DESTROYED, (id: string) => {

			cleanCursor(cursors, eventListeners, scene, id)

		}]
	])

}

//FIXME - there's a bug here when clicking someone after loading a game
function cleanCursor(
	cursors: ImageIndex,
	eventListeners: { [id: string]: (unitId: string) => void; }, scene: BattlegroundScene,
	id: string
) {
	const cursor = cursors[id]
	cursor.setVisible(false)

	const listener = eventListeners[id];
	scene.events.off("update", listener)
}

function renderCursor(
	scene: BattlegroundScene,
	unitId: string,
	cursors: ImageIndex,
	eventListeners: { [id: string]: (unitId: string) => void; },
) {

	const getOrCreateCursor = getOrCreateCursorForChara_(cursors)

	const chara = scene.getChara(unitId)

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
	eventListeners: { [id: string]: (unitId: string) => void; },
) {

	chara.sprite.scene.events.on("update", event);

	eventListeners[chara.id] = event;
}
