import { scene } from "@Scenes/Battleground/BattlegroundScene";
import { goldTextElement } from "..";
import { titleTextConfig } from "../../constants/constants";
import { tween } from "../../Utils/animation";


export function onGoldChanged(newTotalGold: number, goldDelta: number): void {
	if (goldTextElement) {
		goldTextElement.setText(`${newTotalGold}`);
		if (goldDelta !== 0) {
			goldChangeAnimation(goldDelta);
		}
	}
}

async function goldChangeAnimation(gold: number) {
	const sign = gold > 0 ? "+" : "";
	const animationText = `${sign}${gold}`;

	if (!goldTextElement) return;

	const bounds = goldTextElement.getBounds();
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