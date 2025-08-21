import Phaser from "phaser";
import * as c from "../constants/constants";
import { scene } from "../Scenes/Battleground/BattlegroundScene";
import { tween } from "../Utils/animation";
import * as Tooltip from "./Tooltip";

let uiContainer: Phaser.GameObjects.Container | null = null;
let goldContainer: Phaser.GameObjects.Container | null = null;
let goldTextElement: Phaser.GameObjects.Text | null = null;
let prestigeTextElement: Phaser.GameObjects.Text | null = null;

export function handlePurchaseFailed(payload: { unitName: string, reason: string, cost?: number }): void {
	let message = `Could not buy ${payload.unitName}. `;
	switch (payload.reason) {
		case "PARTY_FULL":
			message += "Your party is full!";
			break;
		case "INSUFFICIENT_GOLD":
			message += `Not enough gold! (Cost: ${payload.cost ?? 'N/A'})`;
			break;
		case "SLOT_OCCUPIED":
			message += "That slot is already occupied.";
			break;
		default: message += "Reason unknown.";
	}
	handleUserMessageRequested({ text: message, type: 'error' });

}

export function handleGoldChanged(newTotalGold: number, goldDelta: number): void {
	if (goldTextElement) {
		goldTextElement.setText(`${newTotalGold}`);
		if (goldDelta !== 0) {
			goldChangeAnimation(goldDelta);
		}
	}
}

export function updatePrestige(newTotalPrestige: number, _prestigeDelta: number): void {
	if (prestigeTextElement) {
		prestigeTextElement.setText(`${newTotalPrestige}`);
	}
}

export function createMainUI() {
	destroyMainUI();

	uiContainer = scene.add.container(0, 0);

	Tooltip.init();

	createGoldText(uiContainer);

	if (prestigeTextElement) {
		prestigeTextElement.setText(`${scene.state.gameData.player.prestige}`);
	}
}

function createGoldText(parent: Phaser.GameObjects.Container): void {
	const initialGold = scene.state.gameData.player.gold;

	const displayX = c.SCREEN_WIDTH - 120;
	const displayY = 30;

	goldContainer = scene.add.container(displayX, displayY);

	const background = scene.add.graphics();
	background.fillStyle(0x2d3d1a, 0.8);
	background.lineStyle(3, 0x1a2610, 1);
	background.fillRoundedRect(-50, -20, 100, 40, 20);
	background.strokeRoundedRect(-50, -20, 100, 40, 20);
	goldContainer.add(background);

	const coinIcon = scene.add.image(-25, 0, 'coin').setScale(0.8);
	goldContainer.add(coinIcon);

	goldTextElement = scene.add.text(
		0, 0,
		`${initialGold}`,
		{
			...c.titleTextConfig,
			fontSize: '24px',
			color: '#ffffff'
		}
	).setOrigin(0, 0.5);
	goldContainer.add(goldTextElement);

	const initialPrestige = scene.state.gameData.player.prestige;
	const prestigeContainer = scene.add.container(0, 44);

	const prestigeBg = scene.add.graphics();
	prestigeBg.fillStyle(0x3a2d1a, 0.8);
	prestigeBg.lineStyle(3, 0x261a10, 1);
	prestigeBg.fillRoundedRect(-50, -20, 100, 40, 20);
	prestigeBg.strokeRoundedRect(-50, -20, 100, 40, 20);
	prestigeContainer.add(prestigeBg);

	const prestigeIcon = scene.add.image(-25, 0, 'coin').setScale(0.8);
	prestigeIcon.setTint(0x4a90ff);
	prestigeContainer.add(prestigeIcon);

	prestigeTextElement = scene.add.text(
		0, 0,
		`${initialPrestige}`,
		{
			...c.titleTextConfig,
			fontSize: '24px',
			color: '#ffffff'
		}
	).setOrigin(0, 0.5);
	prestigeContainer.add(prestigeTextElement);

	goldContainer.add(prestigeContainer);

	parent.add(goldContainer);
}

export async function handleUserMessageRequested(payload: {
	text: string;
	type: 'error' | 'info' | 'warning' | 'success';
}): Promise<void> {

	const textStyle = c.titleTextConfig;

	const text = scene.add.text(
		c.SCREEN_WIDTH / 2, c.SCREEN_HEIGHT - 100,
		payload.text,
		textStyle,
	).setOrigin(0.5);

	await tween({
		targets: [text],
		scaleX: 1.05,
		scaleY: 1.05,
		duration: 1000,
		yoyo: true,
		ease: "Sine.elastic",
		repeat: 0,
	});

	await tween({
		targets: [text],
		alpha: 0,
	});

	text.destroy();
}

function destroyMainUI(): void {
	if (uiContainer) {
		uiContainer.destroy(true);
		uiContainer = null;
	}
	goldContainer = null;
	goldTextElement = null;
	prestigeTextElement = null;
}

export function destroy(): void {
	destroyMainUI();
	Tooltip.destroyTooltip();
}

async function goldChangeAnimation(gold: number): Promise<void> {
	const sign = gold > 0 ? "+" : "";
	const animationText = `${sign}${gold}`;

	if (!goldTextElement) return;

	const bounds = goldTextElement.getBounds();
	const startX = bounds.centerX;
	const startY = bounds.centerY;

	const goldAmountText = scene.add.text(startX, startY, animationText, c.titleTextConfig)
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

