import * as UIManager from "../../Scenes/Battleground/Systems/UIManager";
import { summonChara } from "../../Scenes/Battleground/Systems/UnitManager";
import { FORCE_ID_PLAYER } from "../Force";
import { ITEMS } from "../Item";
import { BLOB } from "../Job";
import { addUnitToGuild, State } from "../State";
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
			summonChara(unit);
		}
	}),
	makeEncounter("investment_opportunity", TIER.COMMON, "Investment Opportunity", "+2 income", "icon/old_adventurer", {
		type: "instant",
		action: (_scene, state: State) => {
			state.gameData.player.income += 2;
			UIManager.updateUI();
		}
	}),
	makeEncounter("potion_vendor", TIER.COMMON, "Potion Vendor", "You have found a potion vendor", "icon/potion_vendor", {
		type: "item-shop",
		choices: () => [
			ITEMS.RED_POTION(),
			ITEMS.TOXIC_POTION(),
		]
	}),
	makeEncounter("equipment_vendor", TIER.COMMON, "Equipment Vendor", "You have found an equipment vendor", "icon/equipment_vendor", {
		type: "item-shop",
		choices: () => [
			ITEMS.IRON_SWORD(),
			ITEMS.GOLD_RING(),
		]
	}),
];


export default commonEvents;
