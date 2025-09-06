import * as ShopUI from "./ShopUI";
import * as Systems from "../index"
import * as Board from "@Models/Board";
import { skillsIndex } from "@Models/Skills";
import { getState } from "@Models/State";

export function init() {
	ShopUI.create();
}

export async function open(buttonText: string = "Next Round") {
	const availableSkills = Object.keys(skillsIndex);

	const nextRoundCallback = () => {
		Systems.ShopPhase.handleShopPhaseEnded();
		close();
	};

	const onPurchase = (skillId: string) => {
		purchaseSkill(skillId);
	};

	ShopUI.displayShop(
		[],
		availableSkills,
		nextRoundCallback,
		() => { }, // No reroll for skills
		buttonText,
		'skill',
		onPurchase
	);

	Board.setEnemyBoardVisible(false);

	await ShopUI.slideIn();
}

function purchaseSkill(skillId: string) {
	const state = getState();
	const player = state.gameData.player;
	const skill = skillsIndex[skillId];

	if (!skill) return;

	// Check if already owned
	if (player.skills.some(s => s.id === skillId)) {
		console.log("Skill already owned");
		return;
	}

	// Assume cost is 10 prestige for now
	const cost = 10;
	if (player.prestige < cost) {
		console.log("Not enough prestige");
		return;
	}

	// Deduct cost
	player.prestige -= cost;

	// Add skill
	player.skills.push(skill);

	console.log(`Purchased skill: ${skill.name}`);
}

export async function close() {
	await ShopUI.slideOut();
}

export async function handleShopOpenUITrigger(buttonText: string = "Next Round"): Promise<void> {
	await open(buttonText);
}
