import * as UIButton from "@Components/Button/UIButton";
import * as i18n from "@i18n/i18n";
import * as Constants from "@Constants";
import * as GameConstants from "@game/Constants";
import * as EncounterCard from "@Systems/Components/EncounterCard";
import * as animation from "@Utils/animation";
import { env } from "@Env";
import { advancePhase } from "../../BattlegroundScreen";

// Encounter card display layout constants
const ENCOUNTER_CARD_WIDTH = 700;
const ENCOUNTER_CARD_HEIGHT = 220;
const ENCOUNTER_CARD_SPACING = 240;
const ENCOUNTER_CARD_X_OFFSET = 450;
const ENCOUNTER_CARD_BASE_Y = 300;

type EncounterItem = {
	name: string;
	pic: string;
	description: string;
	minRound?: number;
	maxRound?: number;
	id: string;
};

const improveType = (pic: string, type: string): EncounterItem => ({
	name: i18n.t("encounters.improve_type.name", { type }),
	pic,
	minRound: 4,
	description: i18n.t("encounters.improve_type.desc", { type }),
	id: `improve_${type}`,
});

export const allEncounters: EncounterItem[] = [
	{
		name: i18n.t("encounters.upgrade_unit.name"),
		pic: "ui/upgrade_unit",
		description: i18n.t("encounters.upgrade_unit.desc"),
		id: "upgrade_unit",
	},
	improveType("ui/improve_damage", "damage"),
	improveType("ui/improve_heal", "heal"),
	improveType("ui/improve_shield", "shield"),
	improveType("ui/toxic", "poison"),
	improveType("ui/improve_regen", "regen"),
	{
		name: i18n.t("encounters.armory.name"),
		pic: "ui/armory",
		description: i18n.t("encounters.armory.desc"),
		id: "armory",
	},
	{
		name: i18n.t("encounters.healing_tent.name"),
		pic: "ui/improve_heal",
		description: i18n.t("encounters.healing_tent.desc"),
		id: "healing_tent",
	},
	{
		name: i18n.t("encounters.frontier_fort.name"),
		pic: "ui/frontier_fort",
		description: i18n.t("encounters.frontier_fort.desc"),
		id: "frontier_fort",
	},
	{
		name: i18n.t("encounters.forest_pools.name"),
		pic: "ui/forest_pools",
		description: i18n.t("encounters.forest_pools.desc"),
		id: "forest_pools",
	},
	{
		name: i18n.t("encounters.toxic_chamber.name"),
		pic: "ui/toxic",
		description: i18n.t("encounters.toxic_chamber.desc"),
		id: "toxic_chamber",
	},
	{
		name: i18n.t("encounters.trial_circuit.name"),
		pic: "ui/trial_circuit",
		description: i18n.t("encounters.trial_circuit.desc"),
		id: "trial_circuit",
	},
	{
		name: i18n.t("encounters.trappers_guild.name"),
		pic: "ui/improve_slow",
		description: i18n.t("encounters.trappers_guild.desc"),
		id: "trappers_guild",
	},
	{
		name: i18n.t("encounters.thunder_spire.name"),
		pic: "ui/thunder_spire",
		description: i18n.t("encounters.thunder_spire.desc"),
		id: "thunder_spire",
	},
	{
		name: i18n.t("encounters.commanders_tent.name"),
		pic: "ui/commander",
		description: i18n.t("encounters.commanders_tent.desc"),
		id: "commanders_tent",
	},
	{
		name: i18n.t("encounters.assassins_hideout.name"),
		pic: "ui/assassin",
		description: i18n.t("encounters.assassins_hideout.desc"),
		id: "assassins_hideout",
	},
	{
		name: i18n.t("encounters.power_distributor.name"),
		pic: "ui/power_distributor",
		description: i18n.t("encounters.power_distributor.desc"),
		minRound: 3,
		id: "power_distributor",
	},
	{
		name: i18n.t("encounters.power_absorber.name"),
		pic: "ui/power_absorber",
		description: i18n.t("encounters.power_absorber.desc"),
		minRound: 3,
		id: "power_absorber",
	},
	{
		name: i18n.t("encounters.silver_shop"),
		pic: "ui/silver_medal",
		description: i18n.t("encounters.silver_shop_desc"),
		minRound: GameConstants.MIN_ROUND_FOR_SILVER_SHOP,
		maxRound: GameConstants.MIN_ROUND_FOR_GOLD_SHOP - 1,
		id: "silver_shop",
	},
	{
		name: i18n.t("encounters.gold_shop"),
		pic: "ui/gold_medal",
		description: i18n.t("encounters.gold_shop_desc"),
		minRound: GameConstants.MIN_ROUND_FOR_GOLD_SHOP,
		id: "gold_shop",
	},
	{
		name: i18n.t("encounters.combat.name"),
		pic: "ui/armory",
		description: i18n.t("encounters.combat.desc"),
		id: "start_combat",
	},
];

/**
 * Phase start function shared by both "encounter" and "pre_combat" phases.
 * All state is closure-captured — no module-level mutable variables.
 */
export async function startPhase(): Promise<() => Promise<void>> {
	let disableInteraction = false;
	const container = env.scene.add.container();

	const options = env.state.session.options
		.reduce((acc, option) => {
			const encounter = allEncounters.find((e) => e.id === option.id);
			if (encounter) {
				return acc.concat([encounter]);
			}
			return acc;
		}, [] as EncounterItem[]);

	const onSelectEncounter = async (id: string) => {
		if (disableInteraction) {
			return;
		}

		disableInteraction = true;
		container.destroy(true);

		await advancePhase({ type: "select_encounter", encounterId: id });
	};

	options.forEach(async (encounter, index) => {
		const width = ENCOUNTER_CARD_WIDTH;
		const height = ENCOUNTER_CARD_HEIGHT;
		const spacing = ENCOUNTER_CARD_SPACING;

		const x = Constants.SCREEN_WIDTH - ENCOUNTER_CARD_X_OFFSET;
		let y = ENCOUNTER_CARD_BASE_Y + index * spacing;

		if (options.length === 1) {
			y = Constants.SCREEN_HEIGHT / 2;
		}

		const card = EncounterCard.createEncounterCard(container, {
			position: [x + width + 200, y],
			size: [width, height],
			name: encounter.name,
			pic: encounter.pic,
			description: encounter.description,
			onClick: () => onSelectEncounter(encounter.id),
		});

		await animation.delay(100 * index)
		env.scene.tweens.add({
			targets: card.container,
			x,
			duration: 300,
			ease: "Power2",
		});
	});

	if (env.state.session.phase !== "pre_combat") {
		const btn = UIButton.create({
			text: i18n.t("encounters.skip"),
			position: [Constants.SCREEN_WIDTH - 260, Constants.SCREEN_HEIGHT - 50],
			callback: () => {
				void advancePhase({ type: "skip" });
			}
		});

		container.add(btn.container);
	}

	return async () => {
		container.destroy(true);
	};
}