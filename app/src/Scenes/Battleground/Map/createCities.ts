import Phaser from "phaser";
import { City } from "../../../Models/City";

export function createCities(
	scene: Phaser.Scene,
	cities: City[]
): { city: City, sprite: Phaser.GameObjects.Image }[] {

	return cities.map(city => ({
		city,
		sprite: scene
			.add
			.image(city.screenPosition.x, city.screenPosition.y, `${city.type}_map`)
			.setName(city.id),
	}
	))

}
