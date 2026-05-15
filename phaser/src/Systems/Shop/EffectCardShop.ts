import * as ShopPanel from "@Systems/Shop/ShopPanel";
import * as Board from "@Models/Board";
import { delay } from "@Utils/animation";
import { orbsIndex } from "@Systems/Shop/Orbs";
import * as io from "@PhaserIO";
import { SCREEN_WIDTH } from "@Constants/constants";
import { playSoundEffect } from "@Systems/AudioManager";
import { createEncounterCard } from "@Systems/Components/EncounterCard";
import {
	initializeEncounterFocusTargets,
	registerEncounterFocusTarget,
	resetEncounterFocusTargets,
} from "@Systems/Encounter";
import { t } from "@i18n/i18n";
import { getGameController } from "@Core/GameControllerFactory";
import { createLogger } from "@Utils/Logger";
import { getServerAdapter } from "@Core/ServerFactory";
import { getState } from "@Models/State";
import * as Chara from "@Systems/Chara/Chara";

const logger = createLogger("EffectCardShop");

// Effect card shop constants (same as Encounter display)
const EFFECT_CARD_COMPLETION_DELAY_MS = 300;
const EFFECT_CARD_WIDTH = 700;
const EFFECT_CARD_HEIGHT = 220;
const EFFECT_CARD_SPACING = 240;
const EFFECT_CARD_X_OFFSET = 450;
const EFFECT_CARD_BASE_Y = 300;

export async function openUpgradeCorePhase(titleText: string, encounters: string[]): Promise<void> {
	return new Promise<void>(async (resolve) => {
		const container = io.Container();
		container.once("destroy", resetEncounterFocusTargets);
		resetEncounterFocusTargets();

		const completeSectionCallback = async () => {
			await ShopPanel.slideOut();
			// ShopPanel.slideOut() calls removeAll(true) which destroys all children,
			// including the local container, so no explicit container.destroy() needed.
			resolve();
		};

		const title = io.Title1(t(titleText)).setPosition(SCREEN_WIDTH / 2 + 180, 130);
		container.add(title);

		ShopPanel.create(completeSectionCallback);
		// Add the local container to ShopPanel so it participates in slide-in/out animations.
		ShopPanel.container.add(container);

		renderUpgradeCards(container, encounters, async () => {
			container.list.forEach((child) => child.disableInteractive());
			await delay(EFFECT_CARD_COMPLETION_DELAY_MS);
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

		const width = EFFECT_CARD_WIDTH;
		const height = EFFECT_CARD_HEIGHT;
		const spacing = EFFECT_CARD_SPACING;

		const x = SCREEN_WIDTH - EFFECT_CARD_X_OFFSET;
		const y = EFFECT_CARD_BASE_Y + index * spacing;

		const card = createEncounterCard(container, {
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

					// Sync updated unit data from server and refresh visuals.
					// upgrade_core and add_reaction_core only modify the core unit,
					// so only refresh the core to avoid re-summoning all board units.
					const playerId = getState()?.session?.player_id;
					if (playerId) {
						const server = getServerAdapter();
						const updatedSession = await server.getSession(playerId);
						if (updatedSession) {
							const state = getState();
							for (const serverUnit of updatedSession.team.units) {
								const localUnit = state.session.team.units.find(
									(u) => u.id === serverUnit.id
								);
								if (localUnit) Object.assign(localUnit, serverUnit);
								if (serverUnit.isCore) {
									await Chara.refreshUnit(localUnit ?? serverUnit);
								}
							}
						}
					}

					await onUpgradeSelected();
				} else {
					logger.warn("Upgrade action failed");
				}
			},
		});

		registerEncounterFocusTarget({
			setFocused: card.setFocused,
			activate: card.activate,
		});
	});

	initializeEncounterFocusTargets();
}
