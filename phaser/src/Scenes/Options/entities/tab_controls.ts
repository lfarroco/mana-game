


import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { Container, AddChildren } from "@PhaserIO";
import * as Phaser from "phaser";
import { LAYOUT } from "../LAYOUT";
import { Entity } from "@Models/Entities/Entity";
import { createUIButton } from "@UI/UIButton";
import { getState } from "@Models/State";
import switch_tab from "../events/switch_tab";

const tabButtonY = LAYOUT.TAB_BUTTON_Y;
const buttonSpacing = LAYOUT.TAB_BUTTON_SPACING;
const startX = constants.MIDDLE_SCREEN_X - buttonSpacing;


function create() {
	const container = Container();

	const audio = createUIButton(
		'AUDIO',
		vec2(startX, tabButtonY),
		() => getState().currentScene.events.emit(switch_tab.key, 'audio'),
		LAYOUT.TAB_BUTTON_WIDTH
	);

	const graphics = createUIButton(
		'GRAPHICS',
		vec2(startX + buttonSpacing, tabButtonY),
		() => getState().currentScene.events.emit(switch_tab.key, 'graphics'),
		LAYOUT.TAB_BUTTON_WIDTH
	);

	const game = createUIButton(
		'GAME',
		vec2(startX + buttonSpacing * 2, tabButtonY),
		() => getState().currentScene.events.emit(switch_tab.key, 'game'),
		LAYOUT.TAB_BUTTON_WIDTH
	);

	AddChildren(container, [audio.container, graphics.container, game.container])

	return container;
};


const element: Entity<Phaser.GameObjects.Container> = {
	key: "options/tab_controls",
	create
}

export default element;