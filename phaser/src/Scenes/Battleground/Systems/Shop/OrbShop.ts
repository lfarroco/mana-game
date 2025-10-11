import * as ShopUI from "./ShopUI";
import * as Systems from "../index"
import * as Board from "@Models/Board";
import { delay } from "../../../../Utils/animation";
import { pickRandom } from "../../../../utils";
import * as sc from "./constants";
import { getState } from "@Models/State";
import { MagicOrb, MagicOrbCallbacks } from "../../../../components/MagicOrb/MagicOrb";
import { orbsIndex, OrbSpec } from "./Orbs";
import { eqVec2 } from "@Models/Geometry";
import { hexToVector3 } from "../../../../Utils/colorUtils";

export async function open(buttonText: string = "Next Round") {
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

	const nextRoundCallback = () => {
		Systems.ShopPhase.handleShopPhaseEnded();
		close();
	};

	ShopUI.displayCommonShop(nextRoundCallback, buttonText);

	const shopState = ShopUI.getState();
	if (shopState) {
		renderOrbShop(shopState, selectedOrbs, async () => {
			ShopUI.disableNextRoundButton();
			await delay(500);
			Systems.ShopPhase.handleShopPhaseEnded();
			await close();
		});
	}

	Board.setEnemyBoardVisible(false);

	await ShopUI.slideIn();
}

export async function close() {
	await ShopUI.slideOut();
	ShopUI.destroyOrbs();
}

export async function handleShopOpenUITrigger(buttonText: string = "Next Round"): Promise<void> {
	await open(buttonText);
}

export function renderOrbShop(ui: ShopUI.ShopUIState, orbIds: string[], onOrbUsed?: () => void | Promise<void>) {

	const state = getState();
	const scene = state.currentScene
	const ORBS_Y = 200;

	const orbSpacing = sc.TAVERN_CHARA_SPACING;
	ui.orbContainer = scene.add.container(0, 0);

	const bg = scene.add.graphics()

	const bgHeight = (orbIds.length - 1) * orbSpacing + 200;
	const bgY = ORBS_Y - 100;

	bg.fillStyle(0x000000, 0.25);
	bg.fillRoundedRect(
		ui.panelX,
		bgY,
		sc.TAVERN_BG_WIDTH,
		bgHeight,
		sc.SUB_PANEL_CORNER_RADIUS
	)

	ui.orbContainer.add(bg);

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

		// At this point target is guaranteed to be a Zone in dropZones
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
		let applied = false;
		try {
			applied = !!orbSpec.effect(existingUnit);
		} catch (err) {
			console.error(`Error applying orb effect ${orbSpec.name} to ${existingUnit.id}:`, err);
			applied = false;
		}
		if (!applied) {
			console.log(`${orbSpec.name} effect returned false — returning orb to origin`);
			MagicOrbCallbacks.returnToPosition(orb, target);
			return;
		}
		magicOrb.startDissolve();
		onOrbUsed?.();
	}

	orbIds.forEach((orbId: string, index: number) => {
		const orbSpec = orbsIndex[orbId]();

		const orbX = ui.panelX + 100;
		const orbY = ORBS_Y + (index * orbSpacing);

		const magicOrb = new MagicOrb(scene, orbX, orbY, {
			size: 240,
			color: hexToVector3(orbSpec.color),
			intensity: 1.2,
			speed: 1.0,
			enableDrag: true,
			returnDuration: 500,
			onDropTarget: (orb, target) => handleOrbDrop({ orb, target, orbSpec, magicOrb }),
			dropTargetNames: []
		});
		ui.orbContainer!.add(magicOrb.getShader());

		const titleText = scene.add.text(orbX + 100, orbY + -80, orbSpec.name)
			.setOrigin(0)
			.setFontSize(40)
			.setFontFamily("Arial Black")
			.setAlign("left");

		const descriptionText = scene.add.rexBBCodeText(orbX + 100, orbY + 0, orbSpec.tooltip)
			.setOrigin(0)
			.setFontSize(30)
			.setAlign("left")
			.setWrapMode(1)
			.setFontFamily("Arial");

		ui.orbContainer!.add([
			titleText,
			descriptionText
		])

		ui.magicOrbs.push(magicOrb);
		magicOrb.setDepth(1000);
	});

	scene.add.existing(ui.orbContainer!);
	ui.orbContainer!.setDepth(1000);
}