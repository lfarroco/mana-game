import * as Board from "@Components/Board/Board";
import * as sc from "@Screens/Battleground/Components/Shop/constants";
import * as MagicOrb from "@Components/MagicOrb/MagicOrb";
import * as OrbPresentation from "@Screens/Battleground/Components/Shop/OrbPresentation";
import * as Geometry from "@game/Geometry";
import * as colorUtils from "@Utils/colorUtils";
import * as constants from "@Constants";
import * as AudioManager from "@Systems/AudioManager";
import { env, } from "@Env";
import { skipButton } from "../skipButton";
import { dispatchAction } from "@Screens/Battleground/BattlegroundScreen";
import { hasCharaById, refreshChara } from "@Components/Chara/Chara";
import { updatePowerDisplay } from "@Components/Chara/PowerDisplay";

// Orb shop UI constants
const ORB_RETURN_ANIMATION_DURATION_MS = 500;
const ORB_TITLE_FONT_SIZE = 40;
const ORB_TITLE_Y_OFFSET = 80;
const ORB_DESCRIPTION_X_OFFSET = 10;
const ORB_DESCRIPTION_Y_OFFSET = 20;

export async function openOrbShop() {

	const items = renderOrbShop();

	const skipButton_ = skipButton();

	return [...items.flat(), skipButton_];

}

export function renderOrbShop() {

	const orbIds = env.state.session.options.map((o) => o.id);

	const orbSpacing = sc.TAVERN_CHARA_SPACING;
	const totalOrbSpan = Math.max(0, (orbIds.length - 1) * orbSpacing);
	const firstOrbY = constants.SCREEN_HEIGHT / 2 - totalOrbSpan / 2;

	const orbs = orbIds.map((orbId: string, index: number) => {
		const orbSpec = OrbPresentation.getOrbPresentation(orbId);

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

		const shader = magicOrb.getShader();

		const titleText = env.scene.add
			.text(sc.ITEM_DESC_BASE_X, orbY - ORB_TITLE_Y_OFFSET, orbSpec.name, constants.titleTextConfig)
			.setOrigin(0)
			.setFontSize(ORB_TITLE_FONT_SIZE)
			.setAlign("left");

		const descriptionText = env.scene.add
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

		//return magicOrb;
		const handler = (time: number) => {
			magicOrb.update(time);
		};
		env.scene.events.on("update", handler);

		shader.on(Phaser.GameObjects.Events.DESTROY, () => {
			env.scene.events.off("update", handler);
		});

		return [shader, titleText, descriptionText];

	});

	return orbs;

}

function handleOrbDrop(params: {
	orb: MagicOrb.MagicOrb;
	target: Phaser.GameObjects.GameObject;
	orbSpec: OrbPresentation.OrbPresentation;
	magicOrb: MagicOrb.MagicOrb;
}) {
	const { orb, target, orbSpec, magicOrb } = params;
	const playerBoard = Board.getBoardState();

	if (!playerBoard || !playerBoard.dropZones.includes(target as Phaser.GameObjects.Zone)) {
		console.debug("OrbShop", `${orbSpec.name} dropped on non-board target:`, target);
		MagicOrb.MagicOrbCallbacks.returnToPosition(orb, target);
		return;
	}

	const slotIndex = playerBoard.dropZones.indexOf(target as Phaser.GameObjects.Zone);
	const tileX = slotIndex % 3;
	const tileY = Math.floor(slotIndex / 3);

	console.debug("OrbShop",
		`${orbSpec.name} dropped on board slot [${tileX}, ${tileY}] (index: ${slotIndex})`
	);

	const existingUnit = env.state.session.team.units.find((unit) =>
		Geometry.eqVec2(unit.position, [tileX, tileY])
	);

	if (!existingUnit) {
		console.debug("OrbShop", `No unit at position [${tileX}, ${tileY}] - orb returns to position`);
		MagicOrb.MagicOrbCallbacks.returnToPosition(orb, target);
		return;
	}

	console.debug("OrbShop", `Unit ${existingUnit.id} is at this position - applying ${orbSpec.name} effect!`);

	AudioManager.playSoundEffect("sfx_spell_deathstrikeseal");

	magicOrb.startDissolve();

	if (env.state.session.phase !== "orb_shop") return;
	dispatchAction(
		{ type: "apply_orb", orbId: orbSpec.id, targetUnitId: existingUnit.id },
		async () => {
			onOrbApplied(orbSpec.id, existingUnit.id);
		}
	);

}

async function onOrbApplied(orbId: string, targetUnitId: string) {
	const isRowOrb = orbId === "absorb_power_orb" || orbId === "distribute_power_orb";
	const targetUnit = env.state.session.team.units.find((unit) => unit.id === targetUnitId);
	if (!targetUnit) return;

	const [, targetRow] = targetUnit.position;

	for (const serverUnit of env.state.session.team.units) {
		const [, row] = serverUnit.position;
		const isTarget = serverUnit.id === targetUnitId;
		const isInSameRow = isRowOrb && row === targetRow && !isTarget;

		if (!isTarget && !isInSameRow) continue;

		if (isRowOrb) {
			if (hasCharaById(serverUnit.id)) {
				updatePowerDisplay(serverUnit.id);
			}
			continue;
		}

		refreshChara(serverUnit);
	}
}