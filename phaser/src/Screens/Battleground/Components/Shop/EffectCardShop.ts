import * as Board from "@Components/Board/Board";
import * as OrbPresentation from "@Screens/Battleground/Components/Shop/OrbPresentation";
import * as constants from "@Constants";
import * as EncounterCard from "@Components/EncounterCard";
import * as i18n from "@i18n/i18n";
import * as Card from "@game/Entities/Card";
import * as Chara from "@Components/Chara/Chara";
import * as AudioManager from "@Systems/AudioManager";
import * as ForceStats from "@Screens/Battleground/Components/ForceStats";
import * as Effects from "../../../../FX";
import { env } from "@Env";
import { BGContext, dispatchAction } from "../../BattlegroundScreen";
import { skipButton } from "../skipButton";

// Effect card shop constants (same as Encounter display)
//const EFFECT_CARD_COMPLETION_DELAY_MS = 300;
const EFFECT_CARD_WIDTH = 700;
const EFFECT_CARD_HEIGHT = 220;
const EFFECT_CARD_SPACING = 240;
const EFFECT_CARD_X_OFFSET = 450;
const EFFECT_CARD_BASE_Y = 300;

export const openUpgradeCorePhase =
	(_ctx: BGContext) => (titleText: string, encounters: string[]) => {
		const title = env.scene.add
			.text(constants.SCREEN_WIDTH / 2 + 180, 130, i18n.t(titleText), constants.titleTextConfig)
			.setOrigin(0.5);

		const skipButton_ = skipButton();

		const cards = renderUpgradeCards(encounters);

		Board.setEnemyBoardVisible(false);

		return [title, ...cards, skipButton_];
	};

function renderUpgradeCards(encounterIds: string[]) {
	let isResolvingSelection = false;

	return encounterIds.map((encounterId, index) => {
		console.debug("EffectCardShop", "Rendering upgrade card for encounter:", encounterId);
		const encounterSpec = OrbPresentation.getOrbPresentation(encounterId);

		const width = EFFECT_CARD_WIDTH;
		const height = EFFECT_CARD_HEIGHT;
		const spacing = EFFECT_CARD_SPACING;

		const x = constants.SCREEN_WIDTH - EFFECT_CARD_X_OFFSET;
		const y = EFFECT_CARD_BASE_Y + index * spacing;

		return EncounterCard.createEncounterCard({
			position: [x, y],
			size: [width, height],
			name: encounterSpec.name,
			pic: encounterSpec.icon,
			description: encounterSpec.tooltip,
			onClick: async () => {
				if (isResolvingSelection) {
					return;
				}

				isResolvingSelection = true;
				console.debug("EffectCardShop", `Selected upgrade: ${encounterSpec.name}`);

				await dispatchAction(
					{ type: "select_encounter", encounterId },
					async () => {
						// Post-upgrade feedback. upgrade_core and add_reaction_core
						// only modify the core unit, so refresh just the crystal —
						// no re-summon, keeping the board reconciliation diff-free.
						const core = Card.getPlayerPersistentCore(env.state.session);
						Chara.refreshCharaInPlace(core);

						if (Chara.hasCharaById(core.id)) {
							// Fire-and-forget: the power-up beam cleans up its own
							// objects while the phase transition slides the board out.
							// The crystal's rank/power visuals sync with the beam flash.
							void Effects.powerUpEffect(Chara.getScreenPosition(core), () =>
								Chara.refreshCharaInPlace(core)
							);
						}

						AudioManager.playSoundEffect("sfx_spell_deathstrikeseal");

						// Orbs that touch the core's HP (e.g. "increase max life"
						// raises maxLife and heals to full) must refresh the persistent
						// HUD — the life chip and health bar stay on screen between
						// combats.
						if (encounterId === "increase_core_max_life") {
							ForceStats.syncPlayerPersistentForceStats();
						}
					}
				);
			},
		});
	});
}
