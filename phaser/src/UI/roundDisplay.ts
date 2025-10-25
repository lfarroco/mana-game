import * as c from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import * as io from "@PhaserIO";
import { scene } from "@Scenes/Battleground/BattlegroundScene";
import { titleTextConfig } from "@Constants/constants";
import { tween } from "@Utils/animation";

export function roundDisplay() {
	const initialRound = scene.state.gameData.player.round;
	const roundContainer = io.Container();
	io.SetPosition(roundContainer, vec2(ROUND_DISPLAY_X, ROUND_DISPLAY_Y));

	const label = io.Text(
		"Round:",
		{
			...c.titleTextConfig,
			fontSize: '24px',
			color: '#ffffff'
		}
	);
	io.Centralize(label);

	roundTextElement = io.Text(
		initialRound.toString(),
		{
			...c.titleTextConfig,
			fontSize: '24px',
			color: '#ffffff'
		}
	);
	io.SetPosition(roundTextElement, vec2(label.width + 10, 0));
	io.Centralize(roundTextElement);

	io.AddChildren(roundContainer, [label, roundTextElement]);

	return roundContainer;
} export const updateRoundDisplay = (newTotalRound: number): void => {
	roundTextElement!.setText(newTotalRound.toString());
};
export async function roundChangeAnimation() {
	const animationText = "+1";

	const bounds = roundTextElement!.getBounds();
	const startX = bounds.centerX;
	const startY = bounds.centerY;

	const roundAmountText = scene.add.text(
		startX, startY, animationText, titleTextConfig
	)
		.setOrigin(0.5, 0.5)
		.setAlpha(0)
		.setScale(1)
		.setDepth(1000);

	await tween({
		targets: [roundAmountText],
		alpha: 1,
		scale: 1.2,
		y: startY - 30,
	});

	await tween({
		targets: [roundAmountText],
		alpha: 0,
		scale: 1,
		y: startY - 60,
		duration: 800,
	});

	roundAmountText.destroy();
}
export let roundTextElement: TextObj | null = null;
export const ROUND_DISPLAY_X = c.SCREEN_WIDTH - 720;
export const ROUND_DISPLAY_Y = 20;

