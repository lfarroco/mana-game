import * as c from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { getState } from "@Models/State";
import * as io from "@PhaserIO";

export let prestigeTextElement: TextObj | null = null;
export const updatePrestigeDisplay = (newTotalPrestige: number): void => {
	prestigeTextElement!.setText(newTotalPrestige.toString());
};
export const PRESTIGE_DISPLAY_X = c.SCREEN_WIDTH - 520;
export const PRESTIGE_DISPLAY_Y = 20;

export function createPrestigeDisplay() {

	const initialPrestige = getState().gameData.player.prestige;

	const label = io.Text(
		"Prestige:",
		{
			...c.titleTextConfig,
			fontSize: '24px',
			color: '#ffffff'
		}
	);
	io.Centralize(label);

	prestigeTextElement = io.Text(
		initialPrestige.toString(),
		{
			...c.titleTextConfig,
			fontSize: '24px',
			color: '#ffffff'
		}
	);
	io.SetPosition(prestigeTextElement, vec2(label.width + 10, 0));
	io.Centralize(prestigeTextElement);

	const prestigeContainer = io.Container();
	io.SetPosition(prestigeContainer, vec2(PRESTIGE_DISPLAY_X, PRESTIGE_DISPLAY_Y));

	io.AddChildren(prestigeContainer, [label, prestigeTextElement]);

	return prestigeContainer;
}
