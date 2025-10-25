import { scene } from "@Scenes/Battleground/BattlegroundScene";
import { titleTextConfig } from "@Constants/constants";
import { tween } from "@Utils/animation";
import * as UI from "./UI";
import * as winsDisplay from "./Components/winsDisplay";
import * as roundDisplay from "./Components/roundDisplay";
import * as prestigeDisplay from "./Components/prestigeDisplay";
import { winsChangeAnimation } from "./Components/winsDisplay";
import { roundChangeAnimation } from "./Components/roundDisplay";


export function onWinsChanged(newTotalWins: number, winsDelta: number) {
	winsDisplay.updateWinsDisplay(newTotalWins);
	if (winsDelta !== 0) {
		winsChangeAnimation(winsDelta);
	}
}

export function onPrestigeChanged(newTotalPrestige: number, prestigeDelta: number) {
	prestigeDisplay.updatePrestigeDisplay(newTotalPrestige);
	if (prestigeDelta !== 0) {
		prestigeChangeAnimation(prestigeDelta);
	}
}

export function onRoundChanged(newTotalRound: number) {
	roundDisplay.updateRoundDisplay(newTotalRound);
	roundChangeAnimation();
}

async function prestigeChangeAnimation(prestige: number) {
	const sign = prestige > 0 ? "+" : "";
	const animationText = `${sign}${prestige}`;

	const bounds = prestigeDisplay.prestigeTextElement!.getBounds();
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

