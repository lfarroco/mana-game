import * as ShopPanel from "./ShopPanel";
import * as Board from "@Models/Board";
import { delay } from "@Utils/animation";
import { pickRandom } from "../../../../utils";
import * as sc from "./constants";
import { getCurrentScene, getState } from "@Models/State";
import { MagicOrb, MagicOrbCallbacks } from "@Components/MagicOrb/MagicOrb";
import { orbsIndex, OrbSpec } from "./Orbs";
import { eqVec2 } from "@Models/Geometry";
import { hexToVector3 } from "@Utils/colorUtils";
import * as io from "@PhaserIO";
import { titleTextConfig } from "@Constants/constants";
import { playSoundEffect } from "@Systems/AudioManager";
import { size, vec2 } from "@Models/Geometry";
import { Rectangle } from "@PhaserIO";

// New Upgrade Core Phase Function
export async function openUpgradeCorePhase(orbs: string[]): Promise<void> {
	return new Promise<void>(async (resolve) => {
		const container = io.Container();

		const selectedOrbs = pickRandom(orbs, 3);

		const completeSectionCallback = async () => {
			await ShopPanel.slideOut();
			container.destroy();
			resolve();
		};

		ShopPanel.create(completeSectionCallback);

		renderUpgradeCards(container, selectedOrbs, async () => {
			// Disable interactivity to prevent double clicks
			container.list.forEach((child) => child.disableInteractive());
			await delay(500);
			completeSectionCallback();
		});

		// Hide enemy board
		Board.setEnemyBoardVisible(false);

		await ShopPanel.slideIn();
	});
}

function renderUpgradeCards(
	container: Phaser.GameObjects.Container,
	orbIds: string[],
	onUpgradeSelected: () => void | Promise<void>
) {
	const state = getState();
	const scene = getCurrentScene();

	// Find the player's core unit
	const coreUnit = state.gameData.player.units.find((u) => u.isCore);
	if (!coreUnit) {
		console.error("No core unit found for player!");
		return;
	}

	// Update handler array to manage update loops for orbs
	const updateHandlers: ((time: number) => void)[] = [];

	orbIds.forEach((orbId, index) => {
		const orbSpec = orbsIndex[orbId]();

		const offsetY = index * sc.TAVERN_CHARA_SPACING;
		const posX = sc.ITEM_BASE_X;
		const posY = sc.ITEM_BASE_Y + offsetY;

		// Card Background
		const bgPos = vec2(posX + 400, posY);
		const bgSize = size(700, 280);
		// Note: Rectangle returns a Graphics object
		const bgRect = Rectangle(bgPos, bgSize, 0x1f1f1f, 0.8);

		// Make background interactive for the "Card"
		bgRect.setInteractive(new Phaser.Geom.Rectangle(0, 0, bgSize.width, bgSize.height), Phaser.Geom.Rectangle.Contains);

		// Magic Orb Visual
		const magicOrb = new MagicOrb(posX, posY, {
			size: 200,
			color: hexToVector3(orbSpec.color),
			intensity: 1.2,
			speed: 1.0,
			enableDrag: false, // No dragging
		});

		// Visuals container
		container.add(bgRect);
		container.add(magicOrb.getShader());

		// Title
		const titleText = scene.add
			.text(sc.ITEM_DESC_BASE_X, sc.ITEM_DESC_BASE_Y + offsetY, orbSpec.name, titleTextConfig)
			.setOrigin(0)
			.setAlign("left");

		// Description
		const descriptionText = scene.add
			.rexBBCodeText(
				sc.ITEM_DESC_BASE_X + 10,
				sc.ITEM_DESC_BASE_Y + 60 + offsetY, // Adjusted Y offset
				orbSpec.tooltip
			)
			.setOrigin(0)
			.setFontSize(26)
			.setAlign("left")
			.setWrapMode(1)
			.setWrapWidth(600)
			.setFontFamily("Arimo");

		container.add([titleText, descriptionText]);

		updateHandlers.push((time) => magicOrb.update(time));

		// Click Handler
		bgRect.on("pointerdown", async (_pointer: Phaser.Input.Pointer) => {
			console.log(`Selected upgrade: ${orbSpec.name}`);

			// Apply effect
			const applied = orbSpec.effect(coreUnit);
			if (applied) {
				playSoundEffect('sfx_spell_deathstrikeseal');

				// Visual feedback: dissolve orb?
				magicOrb.startDissolve();

				await onUpgradeSelected();
			} else {
				console.warn("Upgrade failed to apply (conditions not met?)");
			}
		});

		// Hover effects
		bgRect.on("pointerover", () => {
			bgRect.clear();
			bgRect.fillStyle(0x333333, 0.9);
			bgRect.fillRect(0, 0, bgSize.width, bgSize.height);
		});
		bgRect.on("pointerout", () => {
			bgRect.clear();
			bgRect.fillStyle(0x1f1f1f, 0.8);
			bgRect.fillRect(0, 0, bgSize.width, bgSize.height);
		});
	});

	const handler = (time: number) => {
		updateHandlers.forEach(h => h(time));
	};

	getCurrentScene().events.on("update", handler);

	container.on(Phaser.GameObjects.Events.DESTROY, () => {
		getCurrentScene().events.off("update", handler);
	});
}

// Restored/Legacy OpenOrbShop for Encounters
export async function openOrbShop(orbs: string[]): Promise<void> {
	return new Promise<void>(async (resolve) => {
		const container = io.Container();

		const selectedOrbs = pickRandom(orbs, 3);

		const completeSectionCallback = async () => {
			await ShopPanel.slideOut();
			container.destroy();

			resolve();
		};

		ShopPanel.create(completeSectionCallback);

		renderOrbShop(container, selectedOrbs, async () => {
			await delay(500);
			completeSectionCallback();
		});

		Board.setEnemyBoardVisible(false);

		await ShopPanel.slideIn();
	});
}

export function renderOrbShop(
	container: Phaser.GameObjects.Container,
	orbIds: string[],
	onOrbUsed?: () => void | Promise<void>
) {
	const state = getState();
	const scene = getCurrentScene();

	const orbSpacing = sc.TAVERN_CHARA_SPACING;

	function handleOrbDrop(params: {
		orb: MagicOrb;
		target: Phaser.GameObjects.GameObject;
		orbSpec: OrbSpec;
		magicOrb: MagicOrb;
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
			eqVec2(unit.position, { x: tileX, y: tileY })
		);

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

		playSoundEffect('sfx_spell_deathstrikeseal');

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
			dropTargetNames: [],
		});

		container.add(magicOrb.getShader());

		const titleText = scene.add
			.text(sc.ITEM_DESC_BASE_X, sc.ITEM_DESC_BASE_Y + offsetY + 50, orbSpec.name, titleTextConfig)
			.setOrigin(0)
			.setFontSize(40)
			.setAlign("left");

		const descriptionText = scene.add
			.rexBBCodeText(sc.ITEM_DESC_BASE_X + 10, sc.ITEM_DESC_BASE_Y + offsetY + 110, orbSpec.tooltip)
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

	getCurrentScene().events.on("update", handler);

	container.on(Phaser.GameObjects.Events.DESTROY, () => {
		getCurrentScene().events.off("update", handler);
	});
}
