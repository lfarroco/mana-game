import * as c from "@Constants/constants";
import { scene } from "@Scenes/Battleground/BattlegroundScene";
import { titleTextConfig } from "@Constants/constants";
import * as io from "@PhaserIO";
import { vec2 } from "@Models/Geometry";
import { tween } from "@Utils/animation";

let winsTextElement: TextObj | null = null;
export const WINS_DISPLAY_X = c.SCREEN_WIDTH - 920;
export const WINS_DISPLAY_Y = 20;

export function create() {
	const initialWins = state.gameData.player.wins;

	const label = io.Text(
		"Wins:",
		{
			...c.titleTextConfig,
			fontSize: '24px',
			color: '#ffffff'
		}
	)
	io.Centralize(label);

	winsTextElement = io.Text(
		initialWins.toString(),
		{
			...c.titleTextConfig,
			fontSize: '24px',
			color: '#ffffff'
		}
	);
	io.Centralize(winsTextElement);
	io.SetPosition(winsTextElement, vec2(label.width + 10, 0));

	const winsContainer = io.Container();
	io.SetPosition(winsContainer, vec2(WINS_DISPLAY_X, WINS_DISPLAY_Y));
	io.AddChildren(winsContainer, [label, winsTextElement]);
	return winsContainer;
}

export const updateWinsDisplay = (newTotalWins: number): void => {
	winsTextElement!.setText(newTotalWins.toString());
};

export async function winsChangeAnimation(wins: number) {
	const sign = wins > 0 ? "+" : "";
	const animationText = `${sign}${wins}`;

	const bounds = winsTextElement!.getBounds();
	const startX = bounds.centerX;
	const startY = bounds.centerY;

	const winsAmountText = scene.add.text(
		startX, startY, animationText, titleTextConfig
	)
		.setOrigin(0.5, 0.5)
		.setAlpha(0)
		.setScale(1)
		.setDepth(1000);

	await tween({
		targets: [winsAmountText],
		alpha: 1,
		scale: 1.2,
		y: startY - 30,
	});

	await tween({
		targets: [winsAmountText],
		alpha: 0,
		scale: 1,
		y: startY - 60,
		duration: 800,
	});

	winsAmountText.destroy();
}

