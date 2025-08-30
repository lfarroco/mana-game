import * as c from "../constants/constants";
import { scene } from "@Scenes/Battleground/BattlegroundScene";
import { tween } from "../Utils/animation";
import * as Tooltip from "./Tooltip";
export * as events from "./events"

let uiContainer: Container | null = null;
let goldContainer: Container | null = null;
export let goldTextElement: TextObj | null = null;
let prestigeTextElement: TextObj | null = null;

export function updatePrestige(newTotalPrestige: number, _prestigeDelta: number): void {
	if (prestigeTextElement) {
		prestigeTextElement.setText(`${newTotalPrestige}`);
	}
}

export function init() {

	uiContainer = scene.add.container(0, 0);

	Tooltip.init();

	createGoldText(uiContainer);

	if (prestigeTextElement) {
		prestigeTextElement.setText(`${scene.state.gameData.player.prestige}`);
	}
}

function createGoldText(parent: Container): void {
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


export function destroy(): void {
	if (uiContainer) {
		uiContainer.destroy(true);
		uiContainer = null;
	}
	goldContainer = null;
	goldTextElement = null;
	prestigeTextElement = null;
	Tooltip.destroyTooltip();
}


