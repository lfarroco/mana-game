import * as Constants from "@Constants";
import * as animation from "@Utils/animation";
import * as Tooltip from "@Components/Tooltip/Tooltip";
import * as roundDisplay from "@Screens/Battleground/Components/UI/roundDisplay";
import * as livesDisplay from "@Screens/Battleground/Components/UI/livesDisplay";
import * as winsDisplay from "@Screens/Battleground/Components/UI/winsDisplay";
import * as headerBackground from "@Screens/Battleground/Components/UI/headerBackground";
import * as menuButton from "@Screens/Battleground/Components/menuButton";
import * as uiEvents from "@Screens/Battleground/Components/UI/events";
export * as events from "@Screens/Battleground/Components/UI/events";
import { env, makeContainer as container } from "@Env";
import { BattlegroundEvent } from "../../../../Events";

let uiContainer: Container | null = null;

export function registerListeners(): (() => void)[] {
	return [
		BattlegroundEvent.winsChanged.listen(({ wins, delta }) => {
			uiEvents.onWinsChanged({ wins, delta });
		}),
		BattlegroundEvent.livesChanged.listen(({ lives, delta }) => {
			uiEvents.onLivesChanged({ lives, delta });
		}),
		BattlegroundEvent.roundChanged.listen(({ round }) => {
			uiEvents.onRoundChanged({ round });
		}),
	];
}

export function create() {

	const headerContainer = container([
		headerBackground.create,
		roundDisplay.create,
		livesDisplay.create,
		winsDisplay.create,
	]);
	headerContainer.setPosition(580, 0);

	uiContainer = container([headerContainer, menuButton.create()]);

	return uiContainer;
}

export async function handleUserMessageRequested(payload: {
	text: string;
	type: "error" | "info" | "warning" | "success";
}): Promise<void> {
	const text = env.scene.add.text(0, 0, payload.text, Constants.titleTextConfig);

	text.setOrigin(0.5);
	text.setPosition(Constants.SCREEN_WIDTH / 2, Constants.SCREEN_HEIGHT - 100);

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

	text.destroy(true);
}

export function destroy(): void {
	uiContainer!.destroy(true);
	uiContainer = null;
	Tooltip.destroyTooltip();
}
