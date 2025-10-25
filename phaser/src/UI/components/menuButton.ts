import { createUIButton } from "@Components/UIButton";
import * as c from "@Constants/constants";
import { size, vec2 } from "@Models/Geometry";
import * as io from "@PhaserIO";

export function create() {

	const btn = createUIButton(
		"Menu",
		vec2(1800, 30),
		() => {
			createPanel();
		}
	)

	return btn.container
}


export function createPanel() {
	const overlay = io.Rectangle(
		c.MIDDLE_SCREEN,
		c.WHOLE_SCREEN,
		0x000000,
		0.1)
	io.SetInteractiveRect(overlay, size(c.SCREEN_WIDTH, c.SCREEN_HEIGHT))
	//state.backgroundOverlay.setDepth(1000);

	const panelWidth = 850;
	const panelHeight = 850;
	const panelX = c.MIDDLE_SCREEN.x;
	const panelY = c.MIDDLE_SCREEN.y;

	const resultsBackground = io.BorderedRoundRect(
		vec2(panelX, panelY),
		size(panelWidth, panelHeight),
		10,
		0x2c3e50, 1
	)

	const title = io.Text("Menu", { color: "#ffffff", fontSize: "48px" })
	io.SetPosition(title, vec2(panelX, panelY - panelHeight / 2 + 50));
	io.Centralize(title);

	const returnToTitleButton = createUIButton(
		"Return to Title",
		vec2(panelX, panelY - 200),
		() => {
			io.Destroy(container);
		}
	)

	const saveGameButton = createUIButton(
		"Save Game",
		vec2(panelX, panelY - 100),
		() => {
			io.Destroy(container);
		}
	)

	const loadGameButton = createUIButton(
		"Load Game",
		vec2(panelX, panelY),
		() => {
			io.Destroy(container);
		}
	)

	const container = io.Container([
		overlay,
		resultsBackground,
		title,
		returnToTitleButton.container,
		saveGameButton.container,
		loadGameButton.container
	])

	return container;
}
