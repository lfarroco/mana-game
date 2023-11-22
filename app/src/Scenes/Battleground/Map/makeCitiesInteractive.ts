import Phaser from "phaser";
import { BattlegroundScene } from "../BattlegroundScene";
import * as Signals from "../../../Models/Signals";

export function makeCitiesInteractive(
	scene: BattlegroundScene,
	cities: Phaser.GameObjects.Image[]
) {
	cities.forEach(city => {
		city.setInteractive();
		city.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer, x: number, y: number) => {

			if (pointer.upElement.tagName !== "CANVAS") return;

			Signals.emit(Signals.index.CITY_SELECTED, city.name)
		});
	});

}
