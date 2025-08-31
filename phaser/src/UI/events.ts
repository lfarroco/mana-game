import { scene } from "@Scenes/Battleground/BattlegroundScene";
import { titleTextConfig } from "../constants/constants";
import { tween } from "../Utils/animation";
import * as UI from "./UI";


export function onGoldChanged(newTotalGold: number, goldDelta: number) {
	UI.updateGoldDisplay(newTotalGold);
	if (goldDelta !== 0) {
		goldChangeAnimation(goldDelta);
	}
}

export function onWinsChanged(newTotalWins: number, winsDelta: number) {
	UI.updateWinsDisplay(newTotalWins);
	if (winsDelta !== 0) {
		winsChangeAnimation(winsDelta);
	}
}

export function onPrestigeChanged(newTotalPrestige: number, prestigeDelta: number) {
	UI.updatePrestigeDisplay(newTotalPrestige);
	if (prestigeDelta !== 0) {
		prestigeChangeAnimation(prestigeDelta);
	}
}

async function goldChangeAnimation(gold: number) {
	const sign = gold > 0 ? "+" : "";
	const animationText = `${sign}${gold}`;

	const bounds = UI.goldTextElement!.getBounds();
	const startX = bounds.centerX;
	const startY = bounds.centerY;

	const goldAmountText = scene.add.text(
		startX, startY, animationText, titleTextConfig
	)
		.setOrigin(0.5, 0.5)
		.setAlpha(0)
		.setScale(1)
		.setDepth(1000);

	await tween({
		targets: [goldAmountText],
		alpha: 1,
		scale: 1.2,
		y: startY - 30,
	});

	await tween({
		targets: [goldAmountText],
		alpha: 0,
		scale: 1,
		y: startY - 60,
		duration: 800,
	});

	goldAmountText.destroy();
}

async function winsChangeAnimation(wins: number) {
	const sign = wins > 0 ? "+" : "";
	const animationText = `${sign}${wins}`;

	const bounds = UI.winsTextElement!.getBounds();
	const startX = bounds.centerX;
	const startY = bounds.centerY;

	const winsAmountText = scene.add.text(
		startX, startY, animationText, titleTextConfig
	)
		.setOrigin(0.5, 0.5)
		.setAlpha(0)
		.setScale(1)
		.setDepth(1000);

	await tween({
		targets: [winsAmountText],
		alpha: 1,
		scale: 1.2,
		y: startY - 30,
	});

	await tween({
		targets: [winsAmountText],
		alpha: 0,
		scale: 1,
		y: startY - 60,
		duration: 800,
	});

	winsAmountText.destroy();
}

async function prestigeChangeAnimation(prestige: number) {
	const sign = prestige > 0 ? "+" : "";
	const animationText = `${sign}${prestige}`;

	const bounds = UI.prestigeTextElement!.getBounds();
	const startX = bounds.centerX;
	const startY = bounds.centerY;

	const prestigeAmountText = scene.add.text(
		startX, startY, animationText, titleTextConfig
	)
		.setOrigin(0.5, 0.5)
		.setAlpha(0)
		.setScale(1)
		.setDepth(1000);

	await tween({
		targets: [prestigeAmountText],
		alpha: 1,
		scale: 1.2,
		y: startY - 30,
	});

	await tween({
		targets: [prestigeAmountText],
		alpha: 0,
		scale: 1,
		y: startY - 60,
		duration: 800,
	});

	prestigeAmountText.destroy();
}

export function onPurchaseFailed(
	unitName: string, reason: string, cost?: number,
) {

	let message = `Could not buy ${unitName}. `;

	switch (reason) {
		case "PARTY_FULL":
			message += "Your party is full!";
			break;
		case "INSUFFICIENT_GOLD":
			message += `Not enough gold! (Cost: ${cost ?? 'N/A'})`;
			break;
		case "SLOT_OCCUPIED":
			message += "That slot is already occupied.";
			break;
		default: message += "Reason unknown.";
	}

	UI.handleUserMessageRequested({ text: message, type: 'error' });

}

