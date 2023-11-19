import Phaser from "phaser";
import { BattlegroundScene } from "../BattlegroundScene";

export function makeCitiesInteractive(
	scene: BattlegroundScene,
	cities: Phaser.GameObjects.Image[]
) {
	cities.forEach(city => {
		city.setInteractive();
		city.on("pointerup", (pointer: Phaser.Input.Pointer, x: number, y: number) => {

			if (pointer.upElement.tagName !== "CANVAS") return;

			scene.gameEvents.emit("CITY_SELECTED", city.name);
		});
	});

}
