import * as Constants from "@Constants";
import * as animation from "@Utils/animation";
import * as Tooltip from "@Components/Tooltip/Tooltip";
import * as roundDisplay from "@Screens/Battleground/Components/UI/roundDisplay";
import * as livesDisplay from "@Screens/Battleground/Components/UI/livesDisplay";
import * as winsDisplay from "@Screens/Battleground/Components/UI/winsDisplay";
import * as headerBackground from "@Screens/Battleground/Components/UI/headerBackground";
import * as menuButton from "Client/Screens/Battleground/Components/menuButton";
export * as events from "@Screens/Battleground/Components/UI/events";

let uiContainer: Container | null = null;

export function create() {
	const headerContainer = io.Container([
		headerBackground.create,
		roundDisplay.create,
		livesDisplay.create,
		winsDisplay.create,
	]);
	io.SetPosition(headerContainer, [580, 0]);

	uiContainer = io.Container([headerContainer, menuButton.create()]);
}

export async function handleUserMessageRequested(payload: {
	text: string;
	type: "error" | "info" | "warning" | "success";
}): Promise<void> {
	const text = io.Text(payload.text, Constants.titleTextConfig);

	io.Centralize(text);
	io.SetPosition(text, [Constants.SCREEN_WIDTH / 2, Constants.SCREEN_HEIGHT - 100]);

	await animation.tween({
		targets: [text],
		scaleX: 1.05,
		scaleY: 1.05,
		duration: 1000,
		yoyo: true,
		ease: "Sine.elastic",
		repeat: 0,
	});

	await animation.tween({ targets: [text], alpha: 0 });

	io.Destroy(text);
}

export function destroy(): void {
	uiContainer!.destroy(true);
	uiContainer = null;
	Tooltip.destroyTooltip();
}
