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
	prestigeTextElement!.setText(`${newTotalPrestige}`);
}

export function updateGold(newTotalGold: number) {
	goldTextElement!.setText(`${newTotalGold}`);
}

export function init() {

	uiContainer = scene.add.container(0, 0);

	Tooltip.init();

	createGoldDisplay(uiContainer);

	createPrestigeDisplay(uiContainer);

}

function createGoldDisplay(parent: Container): void {
	const initialGold = scene.state.gameData.player.gold;

	const displayX = c.SCREEN_WIDTH - 320;
	const displayY = 30;

	goldContainer = scene.add.container(displayX, displayY);

	const label = scene.add.text(
		0, 0,
		"Gold:",
		{
			...c.titleTextConfig,
			fontSize: '24px',
			color: '#ffffff'
		}
	).setOrigin(1, 0.5);
	goldContainer.add(label);

	goldTextElement = scene.add.text(
		100, 0,
		`${initialGold}`,
		{
			...c.titleTextConfig,
			fontSize: '24px',
			color: '#ffffff'
		}
	).setOrigin(0, 0.5);
	goldContainer.add(goldTextElement);

	parent.add(goldContainer);
}

function createPrestigeDisplay(parent: Container): void {

	const displayX = c.SCREEN_WIDTH - 620;
	const displayY = 30;

	const initialPrestige = scene.state.gameData.player.prestige;
	const prestigeContainer = scene.add.container(displayX, displayY);

	const prestigeBg = scene.add.graphics();
	prestigeBg.fillStyle(0x3a2d1a, 0.8);
	prestigeBg.lineStyle(3, 0x261a10, 1);
	prestigeBg.fillRoundedRect(-50, -20, 100, 40, 20);
	prestigeBg.strokeRoundedRect(-50, -20, 100, 40, 20);
	prestigeContainer.add(prestigeBg);

	const label = scene.add.text(
		0, 0,
		"Prestige:",
		{
			...c.titleTextConfig,
			fontSize: '24px',
			color: '#ffffff'
		}
	).setOrigin(1, 0.5);
	prestigeContainer.add(label);

	prestigeTextElement = scene.add.text(
		100, 0,
		`${initialPrestige}`,
		{
			...c.titleTextConfig,
			fontSize: '24px',
			color: '#ffffff'
		}
	).setOrigin(0, 0.5);
	prestigeContainer.add(prestigeTextElement);

	parent.add(prestigeContainer);
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


