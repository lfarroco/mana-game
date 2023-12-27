import Phaser from "phaser";
import { City } from "../../../Models/City";

export function createCities(
	scene: Phaser.Scene,
	cities: City[]
): Phaser.GameObjects.Image[] {

	return cities.map(city => scene
		.add
		.image(city.screenPosition.x, city.screenPosition.y, `${city.type}_map`)
		.setName(city.id));

}
