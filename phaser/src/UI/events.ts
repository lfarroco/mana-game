import { scene } from "@Scenes/Battleground/BattlegroundScene";
import { titleTextConfig } from "../constants/constants";
import { tween } from "../Utils/animation";
import * as UI from "./UI";


export function onGoldChanged(newTotalGold: number, goldDelta: number) {
	UI.goldTextElement!.setText(`${newTotalGold}`);
	if (goldDelta !== 0) {
		goldChangeAnimation(goldDelta);
	}
}

async function goldChangeAnimation(gold: number) {
	const sign = gold > 0 ? "+" : "";
	const animationText = `${sign}${gold}`;

	if (!UI.goldTextElement) return;

	const bounds = UI.goldTextElement.getBounds();
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

