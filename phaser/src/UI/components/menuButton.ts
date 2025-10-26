import { createUIButton } from "@Components/UIButton";
import * as c from "@Constants/constants";
import { size, vec2 } from "@Models/Geometry";
import { getCurrentScene, getState } from "@Models/State";
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

	const panelWidth = 850;
	const panelHeight = 850;
	const panelX = c.MIDDLE_SCREEN.x;
	const panelY = c.MIDDLE_SCREEN.y;

	const container = io.Container([
		[
			() => io.Rectangle(c.MIDDLE_SCREEN, c.WHOLE_SCREEN, 0x000000, 0.1),
			io.SetInteractiveRect(size(c.SCREEN_WIDTH, c.SCREEN_HEIGHT))
		],
		io.BorderedRoundRect(
			vec2(panelX, panelY),
			size(panelWidth, panelHeight),
			10,
			0x2c3e50, 1
		),
		[
			() => io.Text("Menu", { color: "#ffffff", fontSize: "48px" }),
			title => io.SetPosition(title, vec2(panelX, panelY - panelHeight / 2 + 50)),
			title => io.Centralize(title)
		],
		createUIButton(
			"Return to Title",
			vec2(panelX, panelY - 200),
			() => {
				const state = getState();
				io.Destroy(container);
				getCurrentScene().game.scene.start(c.SCENE_KEYS.TITLE);


				state.battleData = {
					forces: [],
					grid: [],
					units: []
				}
			}
		).container,
		createUIButton(
			"Save Game",
			vec2(panelX, panelY - 100),
			() => {
				io.Destroy(container);

				localStorage.setItem("gameData", JSON.stringify(getState().gameData));

			}
		).container,
		createUIButton(
			"Load Game",
			vec2(panelX, panelY),
			() => {
				io.Destroy(container);
				const data = localStorage.getItem("gameData");
				if (data) {
					getState().gameData = JSON.parse(data);
					getCurrentScene().scene.restart(JSON.parse(data));
				}
			}
		).container
	])

	return container;
}
