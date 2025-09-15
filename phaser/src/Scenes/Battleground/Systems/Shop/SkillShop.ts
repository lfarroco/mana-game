import * as ShopUI from "./ShopUI";
import * as Systems from "../index"
import * as Board from "@Models/Board";
import { skillsIndex } from "@Models/Skills";
import { getState } from "@Models/State";
import * as ForceSkillsDisplay from "@UI/ForceSkillsDisplay";
import { delay } from "../../../../Utils/animation";
import { hideTooltip } from "@UI/Tooltip";

export function init() {
	ShopUI.create();
}

export async function open(buttonText: string = "Next Round") {
	const availableSkills = Object.keys(skillsIndex);

	const nextRoundCallback = () => {
		Systems.ShopPhase.handleShopPhaseEnded();
		close();
	};

	const onPurchase = async (skillId: string) => {
		purchaseSkill(skillId);
		hideTooltip();
		ShopUI.disableNextRoundButton();
		ShopUI.disableSkillCircles();
		await delay(500);
		Systems.ShopPhase.handleShopPhaseEnded();
		await close();
	};

	ShopUI.displayCommonShop(nextRoundCallback, buttonText, "Skill Shop");
	ShopUI.renderSkills(availableSkills, onPurchase);

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

	player.skills.push(skill);

	console.log(`Purchased skill: ${skill.name}`);

	ForceSkillsDisplay.updatePlayerSkills();
}

export async function close() {
	await ShopUI.slideOut();
}

export async function handleShopOpenUITrigger(buttonText: string = "Next Round"): Promise<void> {
	await open(buttonText);
}
