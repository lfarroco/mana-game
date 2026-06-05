import * as ShopPanel from "@Screens/Battleground/Shop/ShopPanel";
import * as Board from "@Models/Board";
import * as animation from "@Utils/animation";
import * as sc from "@Screens/Battleground/Shop/constants";
import * as MagicOrb from "Client/Components/MagicOrb/MagicOrb";
import * as Orbs from "@Screens/Battleground/Shop/Orbs";
import * as Geometry from "@Models/Geometry";
import * as colorUtils from "@Utils/colorUtils";
import * as constants from "@Constants/constants";
import * as AudioManager from "@Systems/AudioManager";
import * as Logger from "@Utils/Logger";
import * as Chara from "@Systems/Chara/Chara";
import * as ForceStats from "@Screens/Battleground/Components/ForceStats";
import * as PowerDisplay from "@Systems/Chara/PowerDisplay";

const logger = Logger.createLogger("OrbShop");

// Orb shop UI constants
const ORB_SHOP_COMPLETION_DELAY_MS = 300;
const ORB_RETURN_ANIMATION_DURATION_MS = 500;
const ORB_TITLE_FONT_SIZE = 40;
const ORB_TITLE_Y_OFFSET = 80;
const ORB_DESCRIPTION_X_OFFSET = 10;
const ORB_DESCRIPTION_Y_OFFSET = 20;

export async function openOrbShop(
	onOrbApply?: (orbId: string, targetId: string) => void | Promise<void>
): Promise<void> {
	return new Promise<void>(async (resolve) => {

		const container = io.Container();

		const completeSectionCallback = async () => {
			await ShopPanel.SlideOut();
			container.destroy();

			resolve();
		};

		renderOrbShop(
			container,
			async () => {
				await animation.delay(ORB_SHOP_COMPLETION_DELAY_MS);
				completeSectionCallback();
			},
			onOrbApply
		);

		Board.setEnemyBoardVisible(false);

		await ShopPanel.SlideIn();
	});
}

export function renderOrbShop(
	container: Phaser.GameObjects.Container,
	onOrbUsed?: () => void | Promise<void>,
	onOrbApply?: (orbId: string, targetId: string) => void | Promise<void>
) {

	const orbIds = state.session.current_options.map((o) => o.id);

	const orbSpacing = sc.TAVERN_CHARA_SPACING;
	const totalOrbSpan = Math.max(0, (orbIds.length - 1) * orbSpacing);
	const firstOrbY = constants.SCREEN_HEIGHT / 2 - totalOrbSpan / 2;

	async function handleOrbDrop(params: {
		orb: MagicOrb.MagicOrb;
		target: Phaser.GameObjects.GameObject;
		orbSpec: Orbs.OrbSpec;
		magicOrb: MagicOrb.MagicOrb;
	}) {
		const { orb, target, orbSpec, magicOrb } = params;
		const playerBoard = Board.getBoardState();

		if (!playerBoard || !playerBoard.dropZones.includes(target as Phaser.GameObjects.Zone)) {
			logger.debug(`${orbSpec.name} dropped on non-board target:`, target);
			MagicOrb.MagicOrbCallbacks.returnToPosition(orb, target);
			return;
		}

		const slotIndex = playerBoard.dropZones.indexOf(target as Phaser.GameObjects.Zone);
		const tileX = slotIndex % 3;
		const tileY = Math.floor(slotIndex / 3);

		logger.debug(
			`${orbSpec.name} dropped on board slot [${tileX}, ${tileY}] (index: ${slotIndex})`
		);

		const existingUnit = state?.session?.team?.units?.find((unit) =>
			Geometry.eqVec2(unit.position, { x: tileX, y: tileY })
		);

		if (!existingUnit) {
			logger.debug(`No unit at position [${tileX}, ${tileY}] - orb returns to position`);
			MagicOrb.MagicOrbCallbacks.returnToPosition(orb, target);
			return;
		}

		logger.debug(`Unit ${existingUnit.id} is at this position - applying ${orbSpec.name} effect!`);

		const isRowOrb =
			orbSpec.id === "absorb_power_orb" || orbSpec.id === "distribute_power_orb";

		// Only apply effect locally if no server callback is provided
		// When onOrbApply is provided, the server will handle the upgrade.
		// Row power orbs still animate locally first so the board shows the transfer projectiles
		// instead of only popping units after the server sync.
		if (!onOrbApply || isRowOrb) {
			const applied = !!orbSpec.effect(existingUnit);
			if (!applied) {
				logger.debug(`${orbSpec.name} effect returned false — returning orb to origin`);
				MagicOrb.MagicOrbCallbacks.returnToPosition(orb, target);
				return;
			}
		}

		AudioManager.playSoundEffect("sfx_spell_deathstrikeseal");

		magicOrb.startDissolve();

		if (onOrbApply) {
			await onOrbApply(orbSpec.id, existingUnit.id);

			// The resolved action already updated state.session locally.
			const rowY = existingUnit.position?.y;

			for (const serverUnit of state.session.team.units) {
				const isTarget = serverUnit.id === existingUnit.id;
				const isInSameRow =
					isRowOrb && serverUnit.position?.y === rowY && !isTarget;

				if (isTarget || isInSameRow) {
					const localUnit = state.session.team.units.find(
						(u) => u.id === serverUnit.id
					);
					if (localUnit) {
						Object.assign(localUnit, serverUnit);
					}

					if (isRowOrb) {
						if (Chara.hasCharaById(serverUnit.id)) {
							PowerDisplay.updatePowerDisplay(serverUnit.id);
						}
						continue;
					}

					await Chara.refreshChara(localUnit ?? serverUnit);
				}
			}
			ForceStats.syncPlayerPersistentForceStats();
		}

		onOrbUsed?.();
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
