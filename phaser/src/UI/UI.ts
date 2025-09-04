import * as c from "../constants/constants";
import { scene } from "@Scenes/Battleground/BattlegroundScene";
import { tween } from "../Utils/animation";
import * as Tooltip from "./Tooltip";
import * as ForceSkillsDisplay from "./ForceSkillsDisplay";
export * as events from "./events"

const GOLD_DISPLAY_X = c.SCREEN_WIDTH - 320;
const GOLD_DISPLAY_Y = 20;

const PRESTIGE_DISPLAY_X = c.SCREEN_WIDTH - 520;
const PRESTIGE_DISPLAY_Y = 20;

const ROUND_DISPLAY_X = c.SCREEN_WIDTH - 720;
const ROUND_DISPLAY_Y = 20;

const WINS_DISPLAY_X = c.SCREEN_WIDTH - 920;
const WINS_DISPLAY_Y = 20;

let uiContainer: Container | null = null;
export let goldTextElement: TextObj | null = null;
export let prestigeTextElement: TextObj | null = null;
export let winsTextElement: TextObj | null = null;

export const updatePrestigeDisplay = (newTotalPrestige: number): void => {
	prestigeTextElement!.setText(newTotalPrestige.toString());
}

export const updateWinsDisplay = (newTotalWins: number): void => {
	winsTextElement!.setText(newTotalWins.toString());
}

export const updateGoldDisplay = (newTotalGold: number): void => {
	goldTextElement!.setText(newTotalGold.toString());
}

export function init() {

	uiContainer = scene.add.container(0, 0);

	Tooltip.init();

	createGoldDisplay(uiContainer);

	createPrestigeDisplay(uiContainer);

	createRoundDisplay(uiContainer);

	createWinsDisplay(uiContainer);

	ForceSkillsDisplay.initForceSkillsDisplay();

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

function createRoundDisplay(parent: Container): void {
	const initialRound = scene.state.gameData.player.round;
	const roundContainer = scene.add.container(ROUND_DISPLAY_X, ROUND_DISPLAY_Y);

	const label = scene.add.text(
		0, 0,
		"Round:",
		{
			...c.titleTextConfig,
			fontSize: '24px',
			color: '#ffffff'
		}
	).setOrigin(0);
	roundContainer.add(label);

	const roundTextElement = scene.add.text(
		label.width + 10, 0,
		initialRound.toString(),
		{
			...c.titleTextConfig,
			fontSize: '24px',
			color: '#ffffff'
		}
	).setOrigin(0);
	roundContainer.add(roundTextElement);

	parent.add(roundContainer);
}

function createWinsDisplay(parent: Container): void {
	const initialWins = scene.state.gameData.player.wins;
	const winsContainer = scene.add.container(WINS_DISPLAY_X, WINS_DISPLAY_Y);

	const label = scene.add.text(
		0, 0,
		"Wins:",
		{
			...c.titleTextConfig,
			fontSize: '24px',
			color: '#ffffff'
		}
	).setOrigin(0);
	winsContainer.add(label);

	winsTextElement = scene.add.text(
		label.width + 10, 0,
		initialWins.toString(),
		{
			...c.titleTextConfig,
			fontSize: '24px',
			color: '#ffffff'
		}
	).setOrigin(0);
	winsContainer.add(winsTextElement);

	parent.add(winsContainer);
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
	ForceSkillsDisplay.destroyForceSkillsDisplay();
}
