import * as UIButton from "@Components/Button/UIButton";
import * as i18n from "@i18n/i18n";
import * as Constants from "@Constants";
import * as EncounterCard from "@Components/EncounterCard";
import { ENCOUNTERS } from "@game/content/encounters";
import { env } from "@Env";
import { dispatchAction, BGContext } from "../../BattlegroundScreen";
import { encounterActionFor } from "./encounterActions";

// Encounter card display layout constants
const ENCOUNTER_CARD_WIDTH = 700;
const ENCOUNTER_CARD_HEIGHT = 220;
const ENCOUNTER_CARD_SPACING = 240;
const ENCOUNTER_CARD_X_OFFSET = 450;
const ENCOUNTER_CARD_BASE_Y = 300;
const ENCOUNTER_HEADER_Y = 130;

type EncounterItem = {
	name: string;
	pic: string;
	description: string;
	minRound?: number;
	maxRound?: number;
	id: string;
	/** True for follow-up reveal encounters (roulette wheel results) — not
	 *  generated in the normal pool. Used to style the reveal as a prize choice. */
	revealOnly?: boolean;
};

export const allEncounters: EncounterItem[] = ENCOUNTERS.map((e) => ({
	id: e.id,
	name: i18n.t(e.nameKey, e.params),
	pic: e.pic,
	description: i18n.t(e.descriptionKey, e.params),
	...(e.minRound !== undefined ? { minRound: e.minRound } : {}),
	...(e.maxRound !== undefined ? { maxRound: e.maxRound } : {}),
	...(e.revealOnly !== undefined ? { revealOnly: e.revealOnly } : {}),
}));

/**
 * Phase start function shared by both "encounter" and "pre_combat" phases.
 * All state is closure-captured — no module-level mutable variables.
 */
export const encounterPhase =
	(renderSkipBtn = true) =>
	(_ctx: BGContext) => {
		let disableInteraction = false;

		const options = env.state.session.options.reduce((acc, option) => {
			const encounter = allEncounters.find((e) => e.id === option.id);
			if (encounter) {
				return acc.concat([encounter]);
			}
			return acc;
		}, [] as EncounterItem[]);

		// A11 (docs/wacky-content-plan.md): the roulette wheel spins out reward
		// cards the player picks one from — add a header so the reveal reads as
		// a prize choice rather than a standard encounter row.
		const isRouletteReveal = options.length > 0 && options.every((e) => e.revealOnly);
		const revealHeader = isRouletteReveal
			? env.scene.add
					.text(
						Constants.SCREEN_WIDTH / 2,
						ENCOUNTER_HEADER_Y,
						i18n.t("encounters.roulette_reveal_header"),
						Constants.titleTextConfig
					)
					.setOrigin(0.5)
			: null;

		const onSelectEncounter = async (id: string) => {
			if (disableInteraction) {
				return;
			}

			disableInteraction = true;

			dispatchAction(encounterActionFor(id));
		};

		const cards = options.map((encounter, index) => {
			const width = ENCOUNTER_CARD_WIDTH;
			const height = ENCOUNTER_CARD_HEIGHT;
			const spacing = ENCOUNTER_CARD_SPACING;

			const x = Constants.SCREEN_WIDTH - ENCOUNTER_CARD_X_OFFSET;
			let y = ENCOUNTER_CARD_BASE_Y + index * spacing;

			if (options.length === 1) {
				y = Constants.SCREEN_HEIGHT / 2;
			}

			const card = EncounterCard.createEncounterCard({
				position: [x, y],
				size: [width, height],
				name: encounter.name,
				pic: encounter.pic,
				description: encounter.description,
				onClick: () => onSelectEncounter(encounter.id),
			});

			return card;
		});

		const skipBtn = UIButton.create({
			text: i18n.t("encounters.skip"),
			position: [Constants.SCREEN_WIDTH - 260, Constants.SCREEN_HEIGHT - 50],
			callback: () => {
				void dispatchAction({ type: "skip" });
			},
		});

		if (!renderSkipBtn) {
			skipBtn.container.alpha = 0;
			skipBtn.disable();
		}

		return [...(revealHeader ? [revealHeader] : []), ...cards, skipBtn];
	};
