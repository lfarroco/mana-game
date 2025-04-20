import * as UIManager from "../../Scenes/Battleground/Systems/UIManager";
import { renderChara } from "../../Scenes/Battleground/Systems/UnitManager";
import { updateUnitAttribute } from "../../Systems/Chara/Chara";
import { FORCE_ID_PLAYER } from "../Force";
import { BLOB } from "../Job";
import { addUnitToGuild, State } from "../State";
import * as Traits from "../Traits";
import { addUnitTrait } from "../Traits";
import { Unit } from "../Unit";
import { Encounter, makeEncounter, TIER } from "./Encounter";

const commonEvents = (): Encounter[] => [
	makeEncounter("odd_job", TIER.COMMON, "Odd Job", "You have been offered a job for 5 gold", "icon/old_adventurer", {
		type: "instant",
		action: (_scene, state: State) => {
			state.gameData.player.gold += 5;
			UIManager.updateUI();
		}
	}),
	makeEncounter("new_friend", TIER.COMMON, "A new friend", "You have made a new friend", "icon/old_adventurer", {
		type: "instant",
		action: (_scene, _state) => {
			const unit = addUnitToGuild(FORCE_ID_PLAYER, BLOB);
			renderChara(unit);
		}
	}),
	makeEncounter("endurance_training", TIER.COMMON, "Endurance Training", "Make a guild member gain 30 HP", "icon/combat_training", {
		type: "unit",
		onChoose: async (_scene: Phaser.Scene, _state, unit: Unit) => {

			updateUnitAttribute(unit, "maxHp", 30);

		}
	}),
	makeEncounter("investment_opportunity", TIER.COMMON, "Investment Opportunity", "+2 income", "icon/old_adventurer", {
		type: "instant",
		action: (_scene, state: State) => {
			state.gameData.player.income += 2;
			UIManager.updateUI();
		}
	}),
	makeEncounter("combat_trainer", TIER.COMMON, "Combat Trainer", "Learn attack skills", "icon/agility_training", {
		type: "unit",
		onChoose: async (_scene: Phaser.Scene, _state, unit: Unit) => {

			const trait = Traits.randomCategoryTrait(Traits.TRAIT_CATEGORY_ATTACK)

			addUnitTrait(trait, unit);
		}
	}),
];


export default commonEvents;
