import * as ShopPanel from "./ShopPanel";
import * as Board from "@Models/Board";
import { delay } from "@Utils/animation";
import { pickRandom } from "../../../../utils";
import * as sc from "./constants";
import { getCurrentScene, getState } from "@Models/State";
import { MagicOrb } from "@Components/MagicOrb/MagicOrb";
import { orbsIndex } from "./Orbs";
import { hexToVector3 } from "@Utils/colorUtils";
import * as io from "@PhaserIO";
import { titleTextConfig } from "@Constants/constants";
import { playSoundEffect } from "@Systems/AudioManager";
import { size, vec2 } from "@Models/Geometry";
import { Rectangle } from "@PhaserIO";

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
			container.list.forEach((child) => child.disableInteractive());
			await delay(500);
			completeSectionCallback();
		});

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

	const coreUnit = state.gameData.player.units.find((u) => u.isCore);
	if (!coreUnit) {
		console.error("No core unit found for player!");
		return;
	}

	const updateHandlers: ((time: number) => void)[] = [];

	orbIds.forEach((orbId, index) => {
		const orbSpec = orbsIndex[orbId]();

		const offsetY = index * sc.TAVERN_CHARA_SPACING;
		const posX = sc.ITEM_BASE_X;
		const posY = sc.ITEM_BASE_Y + offsetY;

		const bgPos = vec2(posX + 400, posY);
		const bgSize = size(700, 280);
		const bgRect = Rectangle(bgPos, bgSize, 0x1f1f1f, 0.8);

		bgRect.setInteractive(new Phaser.Geom.Rectangle(0, 0, bgSize.width, bgSize.height), Phaser.Geom.Rectangle.Contains);

		const magicOrb = new MagicOrb(posX, posY, {
			size: 200,
			color: hexToVector3(orbSpec.color),
			intensity: 1.2,
			speed: 1.0,
			enableDrag: false,
		});

		container.add(bgRect);
		container.add(magicOrb.getShader());

		const titleText = scene.add
			.text(sc.ITEM_DESC_BASE_X, sc.ITEM_DESC_BASE_Y + offsetY, orbSpec.name, titleTextConfig)
			.setOrigin(0)
			.setAlign("left");

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

		bgRect.on("pointerdown", async () => {
			console.log(`Selected upgrade: ${orbSpec.name}`);

			const applied = orbSpec.effect(coreUnit);
			if (applied) {
				playSoundEffect('sfx_spell_deathstrikeseal');

				magicOrb.startDissolve();

				await onUpgradeSelected();
			} else {
				console.warn("Upgrade failed to apply (conditions not met?)");
			}
		});

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
