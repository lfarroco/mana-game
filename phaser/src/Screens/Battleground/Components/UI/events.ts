import * as constants from "@Constants";
import * as animation from "@Utils/animation";
import * as UI from "@Screens/Battleground/Components/UI/UI";
import * as winsDisplay from "@Screens/Battleground/Components/UI/winsDisplay";
import * as livesDisplay from "@Screens/Battleground/Components/UI/livesDisplay";
import * as roundDisplay from "@Screens/Battleground/Components/UI/roundDisplay";
import * as i18n from "@i18n/i18n";
import { env } from "@Env";

export function onWinsChanged({ wins, delta }: { wins: number; delta: number }) {
	winsDisplay.updateWinsDisplay(wins);
	if (delta !== 0) {
		winsDisplay.winsChangeAnimation(delta);
	}
}

export function onLivesChanged({ lives, delta }: { lives: number; delta: number }) {
	livesDisplay.updateLivesDisplay(lives);
	livesChangeAnimation(delta);
}

export function onRoundChanged({ round }: { round: number }) {
	roundDisplay.updateRoundDisplay(round);
}

async function livesChangeAnimation(lives: number) {
	const sign = lives > 0 ? "+" : "";
	const animationText = `${sign}${lives}`;

	const bounds = livesDisplay.getContainerBounds();
	if (!bounds) return;

	const startX = bounds.centerX;
	const startY = bounds.centerY;

	const livesAmountText = env.scene.add
		.text(startX, startY, animationText, constants.titleTextConfig)
		.setOrigin(0.5, 0.5)
		.setAlpha(0)
		.setScale(1)
		.setDepth(1000);

	await animation.tween({
		targets: [livesAmountText],
		alpha: 1,
		scale: 1.2,
		y: startY - 30,
	});

	await animation.tween({
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
			reasonText = i18n.t("shop.messages.partyFull");
			break;
		case "INSUFFICIENT_GOLD":
			reasonText = i18n.t("shop.messages.insufficientGold", { cost: (cost ?? "N/A").toString() });
			break;
		case "SLOT_OCCUPIED":
			reasonText = i18n.t("shop.messages.slotOccupied");
			break;
		default:
			reasonText = i18n.t("shop.messages.unknown");
	}

	const message = i18n.t("shop.messages.purchaseFailed", { unitName, reason: reasonText });

	UI.handleUserMessageRequested({ text: message, type: "error" });
}
