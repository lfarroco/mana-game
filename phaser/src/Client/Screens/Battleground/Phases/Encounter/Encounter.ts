import * as io from "@PhaserIO";
import * as UIButton from "Client/Components/UIButton";
import * as i18n from "@i18n/i18n";
import * as Geometry from "@Models/Geometry";
import * as constants from "@Constants/constants";
import * as EncounterCard from "@Systems/Components/EncounterCard";
import * as GameController from "@Core/GameController";
import * as Types from "@Core/Types";

const MIN_ROUND_FOR_SILVER_SHOP = 1;
const MIN_ROUND_FOR_GOLD_SHOP = 6;

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

let disableInteraction = false;

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
		minRound: MIN_ROUND_FOR_SILVER_SHOP,
		maxRound: MIN_ROUND_FOR_GOLD_SHOP - 1,
		id: "silver_shop",
	},
	{
		name: i18n.t("encounters.gold_shop"),
		pic: "ui/gold_medal",
		description: i18n.t("encounters.gold_shop_desc"),
		minRound: MIN_ROUND_FOR_GOLD_SHOP,
		id: "gold_shop",
	},
	{
		name: i18n.t("encounters.combat.name"),
		pic: "ui/armory",
		description: i18n.t("encounters.combat.desc"),
		id: "combat_encounter",
	},
];

export const displayOptions = async () => new Promise<Types.SessionData>((resolve) => {

	const container = io.Container();

	disableInteraction = false;

	const encounters = state.session.current_options
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

		state.session.encounter_history = state.session.encounter_history || [];
		state.session.encounter_history.push(id);

		const response = await GameController.selectEncounter(id);

		resolve(response);

	};

	const nextRoundCallback = async () => {
		container.destroy(true);

		// Use GameController to properly skip encounter phase
		// TODO: this works, but shouldn't be the way
		const response = await GameController.skipPhase();
		resolve(response);
	};

	encounters.forEach(async (encounter, index) => {
		const width = ENCOUNTER_CARD_WIDTH;
		const height = ENCOUNTER_CARD_HEIGHT;
		const spacing = ENCOUNTER_CARD_SPACING;

		const x = constants.SCREEN_WIDTH - ENCOUNTER_CARD_X_OFFSET;
		let y = ENCOUNTER_CARD_BASE_Y + index * spacing;

		if (encounters.length === 1) {
			y = constants.SCREEN_HEIGHT / 2;
		}

		const card = EncounterCard.createEncounterCard(container, {
			x: x + width + 200,
			y,
			width,
			height,
			name: encounter.name,
			pic: encounter.pic,
			description: encounter.description,
			onClick: () => onSelectEncounter(encounter.id),
		});

		await io.Delay(100 * index)
		io.Tween({
			targets: card.container,
			x,
			duration: 300,
			ease: "Power2",
		});
	});

	// Only show skip button if:
	// 1. Not showing combat_encounter (pre-combat phase)
	const isCombatEncounter = encounters[0].id === "combat_encounter";
	if (!isCombatEncounter) {
		const btn = UIButton.create({
			text: i18n.t("encounters.skip"),
			position: Geometry.vec2(constants.SCREEN_WIDTH - 260, constants.SCREEN_HEIGHT - 50),
			callback: nextRoundCallback,
		});

		container.add(btn.container);
	}

});