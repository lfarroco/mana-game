import { Unit } from "../../../Models/Entities/Unit";
import * as Chara from "../../../Systems/Chara/Chara";
import { vec2 } from "../../../Models/Geometry";
import { summonEffect } from "../../../Effects/summonEffect";
import { tween } from "../../../Utils/animation";
import { BattlegroundScene } from "../BattlegroundScene";
import * as constants from "../../../constants/constants";

let scene: BattlegroundScene;

// This was previously part of an exported CharaManagerState.
// It's now an internal variable, managed solely by this module.
const charaIndex: Chara.Chara[] = [];

export function init(sceneRef: BattlegroundScene) {
	scene = sceneRef;
	if (process.env.NODE_ENV === 'development') {
		//@ts-ignore
		window.debug_getAllManagedCharas = () => [...charaIndex]; // Provide a controlled way to inspect for debugging
	}
}

export function clearCharas() {
	// Iterate over a copy as destroyChara modifies the charaIndex
	[...charaIndex].forEach(chara => {
		destroyChara(chara.id); // destroyChara will remove it from the charaIndex
	});
	// Defensive clear, though the loop should empty it.
	if (charaIndex.length > 0) {
		console.warn("CharaManager: charaIndex not empty after clearCharas loop. Forcibly clearing.");
		charaIndex.length = 0;
	}
}

export function destroyChara(id: string) {
	const charaIndexPos = charaIndex.findIndex(chara => chara.id === id);

	if (charaIndexPos !== -1) {
		const charaInstance = charaIndex[charaIndexPos];

		// Remove from our manager's index *before* calling destroy on the instance.
		// This prevents potential issues if charaInstance.destroy() triggers logic
		// that might try to re-access or re-modify charaIndex for this same ID.
		charaIndex.splice(charaIndexPos, 1);
		if (charaInstance.parent) {
			charaInstance.destroy(); // Phaser's destroy handles scene removal, event cleanup, etc.
		}
	}
}
export async function summonChara(
	unit: Unit,
	useSummonEffect = true,
	fadeIn = true,
) {
	const vec = getCharaPosition(unit);

	if (useSummonEffect) summonEffect(scene, vec);

	const chara = new Chara.Chara(scene, unit);

	registerChara(chara); // Changed from addCharaToState to use the public registration function

	chara.setAlpha(0);

	if (fadeIn)
		tween({
			targets: [chara],
			alpha: 1,
		});
	else
		chara.setAlpha(1);

	return chara
}

// Renamed from addCharaToState for clarity and to reflect it's now adding to the internal index.
// This function is exported because Shop.ts uses it to register Chara instances created for shop items.
export function registerChara(chara: Chara.Chara) {
	if (!charaIndex.some(c => c.id === chara.id)) {
		charaIndex.push(chara);
	} else {
		console.warn(`CharaManager: Attempted to register chara with id ${chara.id} which is already registered.`);
	}
}
// TODO: move to chara
export function getCharaPosition(unit: Unit) {

	const offsetX = unit.force === constants.FORCE_ID_PLAYER ? constants.PLAYER_BOARD_X : constants.CPU_BOARD_X;
	const offsetY = unit.force === constants.FORCE_ID_PLAYER ? constants.PLAYER_BOARD_Y : constants.CPU_BOARD_Y;

	return vec2(
		unit.position.x * constants.TILE_WIDTH + constants.HALF_TILE_WIDTH + offsetX,
		unit.position.y * constants.TILE_HEIGHT + constants.HALF_TILE_HEIGHT + offsetY
	);
}

export function getChara(id: string) {
	const maybeChara = charaIndex.find((chara) => chara.id === id);
	if (!maybeChara) throw new Error(`Chara with id ${id} not found in index.`)
	return maybeChara
}


// TODO: move this to the unit model?
export const getSurroundingAllies = (unit: Unit) => {
	return charaIndex
		.filter(chara => chara.unit.hp > 0)
		.filter(chara => chara.unit.force === unit.force)
		.filter(chara => chara.id !== unit.id)
		.filter(chara => {
			const distance = Phaser.Math.Distance.BetweenPoints(
				unit.position,
				chara.unit.position
			);
			return distance === 1;
		});
}