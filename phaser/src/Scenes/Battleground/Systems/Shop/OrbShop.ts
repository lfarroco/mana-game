import * as ShopUI from "./ShopUI";
import * as Board from "@Models/Board";
import { delay } from "@Utils/animation";
import { pickRandom } from "../../../../utils";
import * as sc from "./constants";
import { getCurrentScene, getState } from "@Models/State";
import { MagicOrb, MagicOrbCallbacks } from "@Components/MagicOrb/MagicOrb";
import { orbsIndex, OrbSpec } from "./Orbs";
import { eqVec2 } from "@Models/Geometry";
import { hexToVector3 } from "@Utils/colorUtils";
import * as PhaseManager from "@Scenes/Battleground/PhaseManager";
import * as io from "@PhaserIO";


export async function open() {

	const container = io.Container();

	const availableOrbs = [
		"crimson_orb",
		"emerald_orb",
		"azure_orb",
		"golden_orb",
		"violet_orb",
		"charge_orb",
		"positional_power_orb",
		"positional_typed_power_orb"
	];

	const selectedOrbs = pickRandom(availableOrbs, 3);

	const nextRoundCallback = async () => {
		PhaseManager.handlePhaseEnded();
		await close();
		container.destroy();
	};

	ShopUI.displayCommonShop(nextRoundCallback);

	renderOrbShop(
		container,
		selectedOrbs, async () => {
			//shopState.nextRoundButton?.disable();
			await delay(500);
			nextRoundCallback();
		});

	Board.setEnemyBoardVisible(false);

	await ShopUI.slideIn();
}

export async function close() {
	await ShopUI.slideOut();
}

export function renderOrbShop(
	container: Phaser.GameObjects.Container,
	orbIds: string[],
	onOrbUsed?: () => void | Promise<void>,
) {

	const state = getState();
	const scene = getCurrentScene();



	const orbSpacing = sc.TAVERN_CHARA_SPACING;

	function handleOrbDrop(params: {
		orb: MagicOrb,
		target: Phaser.GameObjects.GameObject,
		orbSpec: OrbSpec,
		magicOrb: MagicOrb
	}) {
		const { orb, target, orbSpec, magicOrb } = params;
		const playerBoard = Board.getBoardState();

		if (!playerBoard || !playerBoard.dropZones.includes(target as Phaser.GameObjects.Zone)) {
			console.log(`${orbSpec.name} dropped on non-board target:`, target);
			MagicOrbCallbacks.returnToPosition(orb, target);
			return;
		}

		const slotIndex = playerBoard.dropZones.indexOf(target as Phaser.GameObjects.Zone);
		const tileX = slotIndex % 3;
		const tileY = Math.floor(slotIndex / 3);

		console.log(`${orbSpec.name} dropped on board slot [${tileX}, ${tileY}] (index: ${slotIndex})`);

		const existingUnit = state?.gameData?.player?.units?.find((unit) =>
			eqVec2(unit.position, { x: tileX, y: tileY }))

		if (!existingUnit) {
			console.log(`No unit at position [${tileX}, ${tileY}] - orb returns to position`);
			MagicOrbCallbacks.returnToPosition(orb, target);
			return;
		}

		console.log(`Unit ${existingUnit.id} is at this position - applying ${orbSpec.name} effect!`);

		const applied = !!orbSpec.effect(existingUnit);
		if (!applied) {
			console.log(`${orbSpec.name} effect returned false — returning orb to origin`);
			MagicOrbCallbacks.returnToPosition(orb, target);
			return;
		}
		magicOrb.startDissolve();
		onOrbUsed?.();
	}

	const orbs = orbIds.map((orbId: string, index: number) => {
		const orbSpec = orbsIndex[orbId]();

		const offsetY = index * orbSpacing;

		const magicOrb = new MagicOrb(sc.ITEM_BASE_X, sc.ITEM_BASE_Y + offsetY, {
			size: 240,
			color: hexToVector3(orbSpec.color),
			intensity: 1.2,
			speed: 1.0,
			enableDrag: true,
			returnDuration: 500,
			onDropTarget: (orb, target) => handleOrbDrop({ orb, target, orbSpec, magicOrb }),
			dropTargetNames: []
		});

		container.add(magicOrb.getShader());

		const titleText = scene.add.text(
			sc.ITEM_DESC_BASE_X, sc.ITEM_DESC_BASE_Y + offsetY,
			orbSpec.name,
		)
			.setOrigin(0)
			.setFontSize(40)
			.setFontFamily("Arial Black")
			.setAlign("left");

		const descriptionText = scene.add.rexBBCodeText(
			sc.ITEM_DESC_BASE_X, sc.ITEM_DESC_BASE_Y + offsetY + 60,
			orbSpec.tooltip)
			.setOrigin(0)
			.setFontSize(30)
			.setAlign("left")
			.setWrapMode(1)
			.setFontFamily("Arial");

		container.add([
			titleText,
			descriptionText
		])

		return magicOrb;
	});

	const handler = (time: number) => {
		orbs.forEach(orb => orb.update(time));
	}

	getCurrentScene().events.on('update', handler);

	container.on(Phaser.GameObjects.Events.DESTROY, () => {
		getCurrentScene().events.off('update', handler);
	});
}
