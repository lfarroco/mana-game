import { titleTextConfig } from "@Constants/constants";
import { tween } from "@Utils/animation";
import * as UI from "@UI/UI";
import * as winsDisplay from "Client/Screens/Battleground/Components/winsDisplay";
import { winsChangeAnimation } from "Client/Screens/Battleground/Components/winsDisplay";
import * as livesDisplay from "Client/Screens/Battleground/Components/livesDisplay";
import * as roundDisplay from "Client/Screens/Battleground/Components/roundDisplay";
import { getCurrentScene } from "@Models/State";
import { t } from "@i18n/i18n";

export function onWinsChanged(newTotalWins: number, winsDelta: number) {
	winsDisplay.updateWinsDisplay(newTotalWins);
	if (winsDelta !== 0) {
		winsChangeAnimation(winsDelta);
	}
}

export function onLivesChanged(newTotalLives: number, livesDelta: number) {
	livesDisplay.updateLivesDisplay(newTotalLives);
	livesChangeAnimation(livesDelta);
}

export function onRoundChanged(newRound: number) {
	roundDisplay.updateRoundDisplay(newRound);
}

async function livesChangeAnimation(lives: number) {
	const sign = lives > 0 ? "+" : "";
	const animationText = `${sign}${lives}`;

	const bounds = livesDisplay.getContainerBounds();
	if (!bounds) return;

	const startX = bounds.centerX;
	const startY = bounds.centerY;

	const livesAmountText = getCurrentScene()
		.add.text(startX, startY, animationText, titleTextConfig)
		.setOrigin(0.5, 0.5)
		.setAlpha(0)
		.setScale(1)
		.setDepth(1000);

	await tween({
		targets: [livesAmountText],
		alpha: 1,
		scale: 1.2,
		y: startY - 30,
	});

	await tween({
		targets: [livesAmountText],
		alpha: 0,
		scale: 1,
		y: startY - 60,
		duration: 800,
	});

	livesAmountText.destroy();
}

export function onPurchaseFailed(unitName: string, reason: string, cost?: number) {
	let reasonText = "";

	switch (reason) {
		case "PARTY_FULL":
			reasonText = t("shop.messages.partyFull");
			break;
		case "INSUFFICIENT_GOLD":
			reasonText = t("shop.messages.insufficientGold", { cost: (cost ?? "N/A").toString() });
			break;
		case "SLOT_OCCUPIED":
			reasonText = t("shop.messages.slotOccupied");
			break;
		default:
			reasonText = t("shop.messages.unknown");
	}

	const message = t("shop.messages.purchaseFailed", { unitName, reason: reasonText });

	UI.handleUserMessageRequested({ text: message, type: "error" });
}
