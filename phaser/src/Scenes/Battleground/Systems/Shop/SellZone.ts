import { getState } from "@Models/State";
import { TAVERN_BG_HEIGHT, TAVERN_BG_WIDTH } from "./constants";
import { defaultTextConfig } from "../../../../constants/constants";


let sellZone: Phaser.GameObjects.Zone | null = null;
let sellZoneContainer: Container | null = null;
let sellZoneText: Phaser.GameObjects.Text | null = null;
let sellZoneGraphics: Graphics | null = null;

const x = 950;
const y = 100;
const width = TAVERN_BG_WIDTH;
const height = TAVERN_BG_HEIGHT;
const color = 0xffa500;
const alpha = 0.7;
const text = "SELL";
const style = { fontSize: '32px', color: '#000000', fontStyle: 'bold' };
const cornerRadius = 10;
export const name = "shop_sell_zone";

export function create() {
	const scene = getState().currentScene;

	sellZoneContainer = scene.add.container(0, 0);

	sellZoneContainer.setVisible(false);

	sellZone = scene.add.zone(
		x, y,
		width, height
	);

	sellZone.setName(name);

	sellZoneGraphics = scene.add.graphics({ x, y });
	sellZoneGraphics.save();
	sellZoneGraphics.fillStyle(0x000000, 0.25);
	sellZoneGraphics.fillRoundedRect(6, 6, width, height, cornerRadius);
	sellZoneGraphics.restore();

	sellZoneGraphics.lineStyle(4, 0xffffff, 0.8);
	sellZoneGraphics.fillStyle(color, alpha);
	sellZoneGraphics.fillRoundedRect(0, 0, width, height, cornerRadius);
	sellZoneGraphics.strokeRoundedRect(0, 0, width, height, cornerRadius);

	sellZone.setRectangleDropZone(width, height);

	sellZoneText = scene.add.text(
		x + width / 2,
		y + height / 2,
		text,
		{
			...defaultTextConfig,
			...style,
			stroke: '#222',
			strokeThickness: 6,
			shadow: {
				offsetX: 2,
				offsetY: 2,
				color: '#000',
				blur: 4,
				fill: true
			}
		}
	).setOrigin(0.5);

	sellZoneContainer.add([sellZone, sellZoneGraphics, sellZoneText]);

}


export function show() {

	const scene = getState().currentScene;
	scene.children.bringToTop(sellZoneContainer!);
	sellZoneContainer!.setVisible(true);

}

export function hide() {

	sellZoneContainer!.setVisible(false);
}

export function destroy() {
	if (sellZoneContainer) {
		sellZoneContainer.destroy(true);
		sellZoneContainer = null;
	}
}