import * as ShopPanel from "@Screens/Battleground/Components/Shop/ShopPanel";
import * as Board from "@Models/Board";
import * as sc from "@Screens/Battleground/Components/Shop/constants";
import * as MagicOrb from "Client/Components/MagicOrb/MagicOrb";
import * as Orbs from "@Screens/Battleground/Components/Shop/Orbs";
import * as Geometry from "@Models/Geometry";
import * as colorUtils from "@Utils/colorUtils";
import * as constants from "@Constants";
import * as AudioManager from "@Systems/AudioManager";
import * as Logger from "@Utils/Logger";


// Orb shop UI constants
const ORB_RETURN_ANIMATION_DURATION_MS = 500;
const ORB_TITLE_FONT_SIZE = 40;
const ORB_TITLE_Y_OFFSET = 80;
const ORB_DESCRIPTION_X_OFFSET = 10;
const ORB_DESCRIPTION_Y_OFFSET = 20;

let container: Container | null = null;

export async function openOrbShop(): Promise<void> {

	container?.destroy();
	container = io.Container();

	renderOrbShop(container);

	Board.setEnemyBoardVisible(false);

	await ShopPanel.SlideIn();
}

export async function closeOrbShop(): Promise<void> {

	await ShopPanel.SlideOut();
	container?.destroy();
	container = null;
}

export function renderOrbShop(
	container: Phaser.GameObjects.Container
) {

	const orbIds = state.session.options.map((o) => o.id);

	const orbSpacing = sc.TAVERN_CHARA_SPACING;
	const totalOrbSpan = Math.max(0, (orbIds.length - 1) * orbSpacing);
	const firstOrbY = constants.SCREEN_HEIGHT / 2 - totalOrbSpan / 2;

	function handleOrbDrop(params: {
		orb: MagicOrb.MagicOrb;
		target: Phaser.GameObjects.GameObject;
		orbSpec: Orbs.OrbSpec;
		magicOrb: MagicOrb.MagicOrb;
	}) {
		const { orb, target, orbSpec, magicOrb } = params;
		const playerBoard = Board.getBoardState();

		if (!playerBoard || !playerBoard.dropZones.includes(target as Phaser.GameObjects.Zone)) {
			Logger.debug("OrbShop", `${orbSpec.name} dropped on non-board target:`, target);
			MagicOrb.MagicOrbCallbacks.returnToPosition(orb, target);
			return;
		}

		const slotIndex = playerBoard.dropZones.indexOf(target as Phaser.GameObjects.Zone);
		const tileX = slotIndex % 3;
		const tileY = Math.floor(slotIndex / 3);

		Logger.debug("OrbShop", 
			`${orbSpec.name} dropped on board slot [${tileX}, ${tileY}] (index: ${slotIndex})`
		);

		const existingUnit = state?.session?.team?.units?.find((unit) =>
			Geometry.eqVec2(unit.position, [tileX, tileY])
		);

		if (!existingUnit) {
			Logger.debug("OrbShop", `No unit at position [${tileX}, ${tileY}] - orb returns to position`);
			MagicOrb.MagicOrbCallbacks.returnToPosition(orb, target);
			return;
		}

		Logger.debug("OrbShop", `Unit ${existingUnit.id} is at this position - applying ${orbSpec.name} effect!`);

		const isRowOrb =
			orbSpec.id === "absorb_power_orb" || orbSpec.id === "distribute_power_orb";

		// Row power orbs animate their transfer locally before server reconciliation.
		if (isRowOrb) {
			const applied = !!orbSpec.effect(existingUnit);
			if (!applied) {
				Logger.debug("OrbShop", `${orbSpec.name} effect returned false — returning orb to origin`);
				MagicOrb.MagicOrbCallbacks.returnToPosition(orb, target);
				return;
			}
		}

		AudioManager.playSoundEffect("sfx_spell_deathstrikeseal");

		magicOrb.startDissolve();

		io.screens.battleground.events.orbApplyRequested.emit({
			orbId: orbSpec.id,
			targetUnitId: existingUnit.id,
		});
	}

	const orbs = orbIds.map((orbId: string, index: number) => {
		const orbSpec = Orbs.orbsIndex[orbId]();

		const orbY = firstOrbY + index * orbSpacing;

		const magicOrb = new MagicOrb.MagicOrb(sc.ITEM_BASE_X, orbY, {
			size: 240,
			color: colorUtils.hexToVector3(orbSpec.color),
			intensity: 1.2,
			speed: 1.0,
			enableDrag: true,
			returnDuration: ORB_RETURN_ANIMATION_DURATION_MS,
			onDropTarget: (orb, target) => handleOrbDrop({ orb, target, orbSpec, magicOrb }),
			dropTargetNames: [],
		});

		container.add(magicOrb.getShader());

		const titleText = io.scene.add
			.text(sc.ITEM_DESC_BASE_X, orbY - ORB_TITLE_Y_OFFSET, orbSpec.name, constants.titleTextConfig)
			.setOrigin(0)
			.setFontSize(ORB_TITLE_FONT_SIZE)
			.setAlign("left");

		const descriptionText = io.scene.add
			.rexBBCodeText(
				sc.ITEM_DESC_BASE_X + ORB_DESCRIPTION_X_OFFSET,
				orbY - ORB_DESCRIPTION_Y_OFFSET,
				orbSpec.tooltip
			)
			.setOrigin(0)
			.setFontSize(30)
			.setAlign("left")
			.setWrapMode(1)
			.setFontFamily("Arimo");

		container.add([titleText, descriptionText]);

		return magicOrb;
	});

	const handler = (time: number) => {
		orbs.forEach((orb) => orb.update(time));
	};

	io.scene.events.on("update", handler);

	container.on(Phaser.GameObjects.Events.DESTROY, () => {
		io.scene.events.off("update", handler);
	});
}
