import { vec2 } from "@Models/Geometry";
import { State } from "@Models/State";
import * as c from "@Constants/constants";
import { tween } from "@Utils/animation";
import * as Tooltip from "@Components/Tooltip";
import * as io from "@PhaserIO";
import * as roundDisplay from "@Scenes/Battleground/Components/roundDisplay";
import * as livesDisplay from "@Scenes/Battleground/Components/livesDisplay";
import * as winsDisplay from "@Scenes/Battleground/Components/winsDisplay";
import * as headerBackground from "@Scenes/Battleground/Components/headerBackground";
import * as menuButton from "@Scenes/Battleground/Components/menuButton";
export * as events from "@UI/events";

let uiContainer: Container | null = null;

export function init(state: State) {
	const headerContainer = io.Container([
		headerBackground.create,
		roundDisplay.create,
		livesDisplay.create,
		winsDisplay.create,
	]);
	io.SetPosition(headerContainer, vec2(580, 0));

	uiContainer = io.Container([headerContainer, menuButton.create(state)]);
}

export async function handleUserMessageRequested(payload: {
	text: string;
	type: "error" | "info" | "warning" | "success";
}): Promise<void> {
	const text = io.Text(payload.text, c.titleTextConfig);

	io.Centralize(text);
	io.SetPosition(text, vec2(c.SCREEN_WIDTH / 2, c.SCREEN_HEIGHT - 100));

	await tween({
		targets: [text],
		scaleX: 1.05,
		scaleY: 1.05,
		duration: 1000,
		yoyo: true,
		ease: "Sine.elastic",
		repeat: 0,
	});

	await tween({ targets: [text], alpha: 0 });

	io.Destroy(text);
}

export function destroy(): void {
	uiContainer!.destroy(true);
	uiContainer = null;
	Tooltip.destroyTooltip();
}
