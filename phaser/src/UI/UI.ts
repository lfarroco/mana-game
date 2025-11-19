import * as c from "@Constants/constants";
import { tween } from "@Utils/animation";
import * as Tooltip from "../Components/Tooltip";
import * as io from "@PhaserIO";
import * as livesDisplay from "./components/livesDisplay";
import * as winsDisplay from "./components/winsDisplay";
import { vec2 } from "@Models/Geometry";
import * as menuButton from "./components/menuButton";
export * as events from "./events";

let uiContainer: Container | null = null;

export function init() {
	uiContainer = io.Container([
		livesDisplay.create,
		winsDisplay.create,
		menuButton.create,
	]);
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
