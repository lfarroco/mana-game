import * as ShopPanel from "@Systems/Shop/ShopPanel";
import * as Board from "@Models/Board";
import { delay } from "@Utils/animation";
import { orbsIndex } from "@Systems/Shop/Orbs";
import * as io from "@PhaserIO";
import { SCREEN_WIDTH } from "@Constants/constants";
import { playSoundEffect } from "@Systems/AudioManager";
import { createEncounterCard } from "@Systems/Components/EncounterCard";
import { t } from "@i18n/i18n";
import { getGameController } from "@Core/GameControllerFactory";
import { createLogger } from "@Utils/Logger";

const logger = createLogger("EffectCardShop");

export async function openUpgradeCorePhase(titleText: string, encounters: string[]): Promise<void> {
	return new Promise<void>(async (resolve) => {
		const container = io.Container();

		const completeSectionCallback = async () => {
			await ShopPanel.slideOut();
			container.destroy();
			resolve();
		};

		const title = io.Title1(t(titleText)).setPosition(SCREEN_WIDTH / 2 + 180, 130);
		container.add(title);

		ShopPanel.create(completeSectionCallback);

		renderUpgradeCards(container, encounters, async () => {
			container.list.forEach((child) => child.disableInteractive());
			await delay(300);
			completeSectionCallback();
		});

		Board.setEnemyBoardVisible(false);

		await ShopPanel.slideIn();
	});
}

function renderUpgradeCards(
	container: Container,
	encounterIds: string[],
	onUpgradeSelected: () => void | Promise<void>
) {
	encounterIds.forEach((encounterId, index) => {
		logger.debug("Rendering upgrade card for encounter:", encounterId);
		const encounterSpec = orbsIndex[encounterId]();

		const width = 700;
		const height = 220;
		const spacing = 240;

		const x = SCREEN_WIDTH - 450;
		const y = 300 + index * spacing;

		createEncounterCard(container, {
			x,
			y,
			width,
			height,
			name: encounterSpec.name,
			pic: encounterSpec.icon,
			description: encounterSpec.tooltip,
			onClick: async () => {
				logger.debug(`Selected upgrade: ${encounterSpec.name}`);

				// Use GameController to handle the upgrade selection
				const controller = getGameController();
				const success = await controller.handleAction(encounterId);

				if (success) {
					playSoundEffect("sfx_spell_deathstrikeseal");
					await onUpgradeSelected();
				} else {
					logger.warn("Upgrade action failed");
				}
			},
		});
	});
}
