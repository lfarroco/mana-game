import { Choice, newChoice } from "../../Scenes/Battleground/Systems/Choice";
import * as UIManager from "../../Scenes/Battleground/Systems/UIManager";
import { popText } from "../../Systems/Chara/Animations/popText";
import { pickRandom } from "../../utils";
import { FORCE_ID_PLAYER } from "../Force";
import { BLOB, jobs } from "../Job";
import { emit, signals } from "../Signals";
import { getPlayerForce, State } from "../State";
import { Unit } from "../Unit";
import { Encounter, makeEncounter, TIER } from "./Encounter";

const commonEvents = (): Encounter[] => [
	makeEncounter("odd_job", TIER.COMMON, "Odd Job", "You have been offered a job for 5 gold", "icon/job_contract", {
		type: "instant",
		action: (_scene, state: State) => {
			const playerForce = getPlayerForce(state);
			playerForce.gold += 5;
			UIManager.updateUI();
		}
	}),
	makeEncounter("new_friend", TIER.COMMON, "A new friend", "You have made a new friend", "icon/quest", {
		type: "instant",
		action: (scene, state) => {
			emit(signals.ADD_UNIT_TO_GUILD, FORCE_ID_PLAYER, BLOB);
		}
	}),
	makeEncounter("learn_something_new", TIER.COMMON, "Learn something new", "A guild member has learned something new", "icon/merchant", {
		type: "shop", choices: () => {
			return [
				newChoice("learn", "Learn a New Skill", "Pay 5 gold to learn a new skill", "learn"),
				newChoice("study", "Study the Ancient Texts", "Spend 10 gold to gain knowledge", "study"),
				newChoice("research", "Conduct Research", "Invest 15 gold in research for future benefits", "research")
			]
		}
	}),
	makeEncounter("endurance_training", TIER.COMMON, "Endurance Training", "Make a guild member gain 30 HP", "icon/endurance_training", {
		type: "unit",
		onChoose: async (scene: Phaser.Scene, state, unit: Unit) => {

			unit.maxHp += 30;
			unit.hp = unit.maxHp;

			popText(scene, "+30 MAX HP", unit.id, "heal");
		}
	}),
	makeEncounter("treasure_hunt", TIER.COMMON, "Treasure Hunt", "You have found a treasure chest", "icon/hidden_treasure", {
		type: "instant",
		action: (scene, state: State) => {
			const playerForce = getPlayerForce(state);
			playerForce.gold += 20;
			UIManager.updateUI();
		}
	}),
	makeEncounter("investment_opportunity", TIER.COMMON, "Investment Opportunity", "A merchant offers you a chance to invest in their business, increasing your guild's income.", "icon/quest", {
		type: "instant",
		action: (scene, state: State) => {
			const playerForce = getPlayerForce(state);
			playerForce.income += 2;
			UIManager.updateUI();
		}
	}),
	makeEncounter("the_tavern", TIER.COMMON, "The Tavern", "A rowdy tavern full of potential recruits and rumors", "icon/quest", {
		type: "nested",
		choices: () => {
			return [
				newChoice("tavern", "Hire Mercenary", "Pay 15 gold to recruit a seasoned warrior", "mercenary"),
				newChoice("tavern", "Buy a Round of Drinks", "Spend 5 gold to hear valuable rumors", "rumors"),
				newChoice("tavern", "Join the Card Game", "Gamble 8 gold for a chance to win more", "gamble")
			]
		},
		onChoose: (state: State, choice: Choice) => {
			const playerForce = state.gameData.forces.find(f => f.id === FORCE_ID_PLAYER)!;
			if (choice.value === "mercenary" && playerForce.gold >= 15) {
				playerForce.gold -= 15;
				const randomJob = pickRandom(jobs, 1)[0];
				// TODO: limit tier
				emit(signals.ADD_UNIT_TO_GUILD, FORCE_ID_PLAYER, randomJob.id);
				UIManager.updateUI();
			} else if (choice.value === "rumors" && playerForce.gold >= 5) {
				playerForce.gold -= 5;
				playerForce.income += 1;
				UIManager.updateUI();
			} else if (choice.value === "gamble" && playerForce.gold >= 8) {
				playerForce.gold -= 8;
				if (Math.random() < 0.4) {
					playerForce.gold += 20;
				}
				UIManager.updateUI();
			}
		}
	}),
	makeEncounter("lost_treasure", TIER.COMMON, "Lost Treasure", "You stumble upon a hidden chest in the forest", "icon/hidden_treasure", {
		type: "instant",
		action: (scene, state: State) => {
			const playerForce = getPlayerForce(state);
			playerForce.gold += 10;
			UIManager.updateUI();
		}
	}),

	makeEncounter("shy_trait", TIER.COMMON, "Social Anxiety", "A guild member becomes shy and reserved around others", "icon/personality", {
		type: "unit",
		onChoose: async (scene: Phaser.Scene, state, unit: Unit) => {
			popText(scene, "+ Shy Trait", unit.id, "neutral");
		}
	}),
	makeEncounter("brave_trait", TIER.COMMON, "Bravery", "A guild member shows exceptional bravery in battle", "icon/personality", {
		type: "unit",
		onChoose: async (scene: Phaser.Scene, state, unit: Unit) => {
			popText(scene, "+ Brave Trait", unit.id, "neutral");
		}
	}),
	makeEncounter("greedy_trait", TIER.COMMON, "Greed", "A guild member becomes obsessed with wealth", "icon/personality", {
		type: "unit",
		onChoose: async (scene: Phaser.Scene, state, unit: Unit) => {
			popText(scene, "+ Greedy Trait", unit.id, "neutral");
		}
	}),
	makeEncounter("kind_trait", TIER.COMMON, "Kindness", "A guild member shows exceptional kindness to others", "icon/personality", {
		type: "unit",
		onChoose: async (scene: Phaser.Scene, state, unit: Unit) => {
			popText(scene, "+ Kind Trait", unit.id, "neutral");
		}
	}),
	makeEncounter("cunning_trait", TIER.COMMON, "Cunning", "A guild member shows exceptional cunning in battle", "icon/personality", {
		type: "unit",
		onChoose: async (scene: Phaser.Scene, state, unit: Unit) => {
			popText(scene, "+ Cunning Trait", unit.id, "neutral");
		}
	}),
	makeEncounter("loyal_trait", TIER.COMMON, "Loyalty", "A guild member shows exceptional loyalty to the guild", "icon/personality", {
		type: "unit",
		onChoose: async (scene: Phaser.Scene, state, unit: Unit) => {
			popText(scene, "+ Loyal Trait", unit.id, "neutral");
		}
	}),
	makeEncounter("lazy_trait", TIER.COMMON, "Laziness", "A guild member becomes lazy and unmotivated", "icon/personality", {
		type: "unit",
		onChoose: async (scene: Phaser.Scene, state, unit: Unit) => {
			popText(scene, "+ Lazy Trait", unit.id, "neutral");
		}
	}),
	makeEncounter("brilliant_trait", TIER.COMMON, "Brilliance", "A guild member shows exceptional intelligence", "icon/personality", {
		type: "unit",
		onChoose: async (scene: Phaser.Scene, state, unit: Unit) => {
			popText(scene, "+ Brilliant Trait", unit.id, "neutral");
		}
	}),
	makeEncounter("clumsy_trait", TIER.COMMON, "Clumsiness", "A guild member becomes clumsy and accident-prone", "icon/personality", {
		type: "unit",
		onChoose: async (scene: Phaser.Scene, state, unit: Unit) => {
			popText(scene, "+ Clumsy Trait", unit.id, "neutral");
		}
	}),
	makeEncounter("friendly_trait", TIER.COMMON, "Friendliness", "A guild member shows exceptional friendliness to others", "icon/personality", {
		type: "unit",
		onChoose: async (scene: Phaser.Scene, state, unit: Unit) => {
			popText(scene, "+ Friendly Trait", unit.id, "neutral");
		}
	}),
	makeEncounter("aggressive_trait", TIER.COMMON, "Aggressiveness", "A guild member becomes aggressive and hostile", "icon/personality", {
		type: "unit",
		onChoose: async (scene: Phaser.Scene, state, unit: Unit) => {
			popText(scene, "+ Aggressive Trait", unit.id, "neutral");
		}
	}),
	makeEncounter("intelligent_trait", TIER.COMMON, "Intelligence", "A guild member shows exceptional intelligence", "icon/personality", {
		type: "unit",
		onChoose: async (scene: Phaser.Scene, state, unit: Unit) => {
			popText(scene, "+ Intelligent Trait", unit.id, "neutral");
		}
	}),
	makeEncounter("unlucky_trait", TIER.COMMON, "Unluckiness", "A guild member becomes unlucky and accident-prone", "icon/personality", {
		type: "unit",
		onChoose: async (scene: Phaser.Scene, state, unit: Unit) => {
			popText(scene, "+ Unlucky Trait", unit.id, "neutral");
		}
	}),
	makeEncounter("optimistic_trait", TIER.COMMON, "Optimism", "A guild member shows exceptional optimism", "icon/personality", {
		type: "unit",
		onChoose: async (scene: Phaser.Scene, state, unit: Unit) => {
			popText(scene, "+ Optimistic Trait", unit.id, "neutral");
		}
	}),
	makeEncounter("pessimistic_trait", TIER.COMMON, "Pessimism", "A guild member becomes pessimistic and cynical", "icon/personality", {
		type: "unit",
		onChoose: async (scene: Phaser.Scene, state, unit: Unit) => {
			popText(scene, "+ Pessimistic Trait", unit.id, "neutral");
		}
	}),
	makeEncounter("paranoid_trait", TIER.COMMON, "Paranoia", "A guild member becomes convinced everyone is plotting against them", "icon/personality", {
		type: "unit",
		onChoose: async (scene: Phaser.Scene, state, unit: Unit) => {
			popText(scene, "+ Paranoid Trait", unit.id, "neutral");
		}
	}),
	makeEncounter("dramatic_trait", TIER.COMMON, "Dramatic Flair", "A guild member now treats every minor inconvenience as a catastrophe", "icon/personality", {
		type: "unit",
		onChoose: async (scene: Phaser.Scene, state, unit: Unit) => {
			popText(scene, "+ Dramatic Trait", unit.id, "neutral");
		}
	}),
	makeEncounter("foodie_trait", TIER.COMMON, "Battlefield Gourmet", "A guild member now critiques food even during combat", "icon/personality", {
		type: "unit",
		onChoose: async (scene: Phaser.Scene, state, unit: Unit) => {
			popText(scene, "+ Foodie Trait", unit.id, "neutral");
		}
	}),
	makeEncounter("narcissistic_trait", TIER.COMMON, "Mirror Admirer", "A guild member can't stop looking at their reflection in polished shields", "icon/personality", {
		type: "unit",
		onChoose: async (scene: Phaser.Scene, state, unit: Unit) => {
			popText(scene, "+ Narcissistic Trait", unit.id, "neutral");
		}
	}),
	makeEncounter("punmaster_trait", TIER.COMMON, "Terrible Punster", "A guild member now makes awful puns at every opportunity", "icon/personality", {
		type: "unit",
		onChoose: async (scene: Phaser.Scene, state, unit: Unit) => {
			popText(scene, "+ Punmaster Trait", unit.id, "neutral");
		}
	}),
	makeEncounter("conspiracy_trait", TIER.COMMON, "Conspiracy Theorist", "A guild member is convinced the kingdom is run by lizard people", "icon/personality", {
		type: "unit",
		onChoose: async (scene: Phaser.Scene, state, unit: Unit) => {
			popText(scene, "+ Conspiracy Theorist Trait", unit.id, "neutral");
		}
	}),
	makeEncounter("sleepwalker_trait", TIER.COMMON, "Sleepwalker", "A guild member has been found fighting monsters in their pajamas", "icon/personality", {
		type: "unit",
		onChoose: async (scene: Phaser.Scene, state, unit: Unit) => {
			popText(scene, "+ Sleepwalker Trait", unit.id, "neutral");
		}
	})



];

export default commonEvents;