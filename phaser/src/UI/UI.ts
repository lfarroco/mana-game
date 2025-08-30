import * as c from "../constants/constants";
import { scene } from "@Scenes/Battleground/BattlegroundScene";
import { tween } from "../Utils/animation";
import * as Tooltip from "./Tooltip";
export * as events from "./events"

const GOLD_DISPLAY_X = c.SCREEN_WIDTH - 320;
const GOLD_DISPLAY_Y = 20;

const PRESTIGE_DISPLAY_X = c.SCREEN_WIDTH - 520;
const PRESTIGE_DISPLAY_Y = 20;

let uiContainer: Container | null = null;
export let goldTextElement: TextObj | null = null;
let prestigeTextElement: TextObj | null = null;

export const updatePrestige = (newTotalPrestige: number): void => {
	prestigeTextElement!.setText(newTotalPrestige.toString());
}

export const updateGold = (newTotalGold: number): void => {
	goldTextElement!.setText(newTotalGold.toString());
}

export function init() {

	uiContainer = scene.add.container(0, 0);

	Tooltip.init();

	createGoldDisplay(uiContainer);

	createPrestigeDisplay(uiContainer);

}

function createGoldDisplay(parent: Container): void {
	const initialGold = scene.state.gameData.player.gold;

	const goldContainer = scene.add.container(GOLD_DISPLAY_X, GOLD_DISPLAY_Y);

	const label = scene.add.text(
		0, 0,
		"Gold:",
		{
			...c.titleTextConfig,
			fontSize: '24px',
			color: '#ffffff'
		}
	).setOrigin(0);
	goldContainer.add(label);

	goldTextElement = scene.add.text(
		label.width + 10, 0,
		initialGold.toString(),
		{
			...c.titleTextConfig,
			fontSize: '24px',
			color: '#ffffff'
		}
	).setOrigin(0);

	goldContainer.add(goldTextElement);

	parent.add(goldContainer);
}

function createPrestigeDisplay(parent: Container): void {

	const initialPrestige = scene.state.gameData.player.prestige;
	const prestigeContainer = scene.add.container(PRESTIGE_DISPLAY_X, PRESTIGE_DISPLAY_Y);

	const label = scene.add.text(
		0, 0,
		"Prestige:",
		{
			...c.titleTextConfig,
			fontSize: '24px',
			color: '#ffffff'
		}
	).setOrigin(0);
	prestigeContainer.add(label);

	prestigeTextElement = scene.add.text(
		label.width + 10, 0,
		initialPrestige.toString(),
		{
			...c.titleTextConfig,
			fontSize: '24px',
			color: '#ffffff'
		}
	).setOrigin(0);
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
	uiContainer!.destroy(true);
	uiContainer = null;
	Tooltip.destroyTooltip();
}


