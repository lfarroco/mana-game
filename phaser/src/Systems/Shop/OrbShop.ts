import * as ShopPanel from "@Systems/Shop/ShopPanel";
import * as Board from "@Models/Board";
import { delay } from "@Utils/animation";
import { pickRandom } from "@utils";
import * as sc from "@Systems/Shop/constants";
import { State } from "@Models/State";
import { MagicOrb, MagicOrbCallbacks } from "@Components/MagicOrb/MagicOrb";
import { orbsIndex, OrbSpec } from "@Systems/Shop/Orbs";
import { eqVec2 } from "@Models/Geometry";
import { hexToVector3 } from "@Utils/colorUtils";
import * as io from "@PhaserIO";
import { SCREEN_HEIGHT, titleTextConfig } from "@Constants/constants";
import { playSoundEffect } from "@Systems/AudioManager";
import { createLogger } from "@Utils/Logger";
import { getServerAdapter } from "@Core/ServerFactory";
import * as Chara from "@Systems/Chara/Chara";
import * as ForceStats from "Client/Screens/Battleground/ForceStats";
import { updatePowerDisplay } from "@Systems/Chara/PowerDisplay";

const logger = createLogger("OrbShop");

// Orb shop UI constants
const ORB_SHOP_COMPLETION_DELAY_MS = 300;
const ORB_RETURN_ANIMATION_DURATION_MS = 500;
const ORB_TITLE_FONT_SIZE = 40;
const ORB_TITLE_Y_OFFSET = 80;
const ORB_DESCRIPTION_X_OFFSET = 10;
const ORB_DESCRIPTION_Y_OFFSET = 20;

export async function openOrbShop(
	state: State,
	orbs: string[],
	onOrbApply?: (orbId: string, targetId: string) => void | Promise<void>
): Promise<void> {
	return new Promise<void>(async (resolve) => {
		const container = io.Container();

		const selectedOrbs = pickRandom(orbs, 3);

		const completeSectionCallback = async () => {
			await ShopPanel.slideOut();
			container.destroy();

			resolve();
		};

		ShopPanel.create(completeSectionCallback);

		renderOrbShop(
			state,
			container,
			selectedOrbs,
			async () => {
				await delay(ORB_SHOP_COMPLETION_DELAY_MS);
				completeSectionCallback();
			},
			onOrbApply
		);

		Board.setEnemyBoardVisible(false);

		await ShopPanel.slideIn();
	});
}

export function renderOrbShop(
	state: State,
	container: Phaser.GameObjects.Container,
	orbIds: string[],
	onOrbUsed?: () => void | Promise<void>,
	onOrbApply?: (orbId: string, targetId: string) => void | Promise<void>
) {

	const orbSpacing = sc.TAVERN_CHARA_SPACING;
	const totalOrbSpan = Math.max(0, (orbIds.length - 1) * orbSpacing);
	const firstOrbY = SCREEN_HEIGHT / 2 - totalOrbSpan / 2;

	async function handleOrbDrop(params: {
		orb: MagicOrb;
		target: Phaser.GameObjects.GameObject;
		orbSpec: OrbSpec;
		magicOrb: MagicOrb;
	}) {
		const { orb, target, orbSpec, magicOrb } = params;
		const playerBoard = Board.getBoardState();

		if (!playerBoard || !playerBoard.dropZones.includes(target as Phaser.GameObjects.Zone)) {
			logger.debug(`${orbSpec.name} dropped on non-board target:`, target);
			MagicOrbCallbacks.returnToPosition(orb, target);
			return;
		}

		const slotIndex = playerBoard.dropZones.indexOf(target as Phaser.GameObjects.Zone);
		const tileX = slotIndex % 3;
		const tileY = Math.floor(slotIndex / 3);

		logger.debug(
			`${orbSpec.name} dropped on board slot [${tileX}, ${tileY}] (index: ${slotIndex})`
		);

		const existingUnit = state?.session?.team?.units?.find((unit) =>
			eqVec2(unit.position, { x: tileX, y: tileY })
		);

		if (!existingUnit) {
			logger.debug(`No unit at position [${tileX}, ${tileY}] - orb returns to position`);
			MagicOrbCallbacks.returnToPosition(orb, target);
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
				MagicOrbCallbacks.returnToPosition(orb, target);
				return;
			}
		}

		playSoundEffect("sfx_spell_deathstrikeseal");

		magicOrb.startDissolve();

		if (onOrbApply) {
			await onOrbApply(orbSpec.id, existingUnit.id);

			// Sync updated unit data from server and refresh visuals
			const playerId = state?.session?.player_id;
			if (playerId) {
				const server = getServerAdapter();
				const updatedSession = await server.getSession(playerId);
				if (updatedSession) {
					const rowY = existingUnit.position?.y;

					for (const serverUnit of updatedSession.team.units) {
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
									updatePowerDisplay(serverUnit.id);
								}
								continue;
							}

							await Chara.refreshUnit(localUnit ?? serverUnit);
						}
					}
					ForceStats.syncPlayerPersistentForceStats();
				}
			}
		}

		onOrbUsed?.();
	}

	const orbs = orbIds.map((orbId: string, index: number) => {
		const orbSpec = orbsIndex[orbId]();

		const orbY = firstOrbY + index * orbSpacing;

		const magicOrb = new MagicOrb(sc.ITEM_BASE_X, orbY, {
			size: 240,
			color: hexToVector3(orbSpec.color),
			intensity: 1.2,
			speed: 1.0,
			enableDrag: true,
			returnDuration: ORB_RETURN_ANIMATION_DURATION_MS,
			onDropTarget: (orb, target) => handleOrbDrop({ orb, target, orbSpec, magicOrb }),
			dropTargetNames: [],
		});

		container.add(magicOrb.getShader());

		const titleText = io.scene.add
			.text(sc.ITEM_DESC_BASE_X, orbY - ORB_TITLE_Y_OFFSET, orbSpec.name, titleTextConfig)
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
