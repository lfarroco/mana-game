import * as PhaseManager from "@Scenes/Battleground/PhaseManager";
import * as io from "@PhaserIO";
import { createUIButton } from "@Components/UIButton";
import { size, vec2 } from "@Models/Geometry";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "@Constants/constants";
import { openHeroShop } from "./Shop/HeroShop";
import { pickRandom } from "utils";
import { openOrbShop } from "./Shop/OrbShop";

const openHeroShopCallback = (container: Phaser.GameObjects.Container, type: string) => async () => {
	container.destroy(true);
	await openHeroShop(
		(card) => card.effects.some(eff => eff.id === type)
	);
	PhaseManager.handlePhaseEnded();
}

const encounterIndex = (container: Phaser.GameObjects.Container) => [
	{
		name: "Upgrade Unit",
		description: "Upgrade a unit",
		onClick: async () => {
			//open orb shop
			container.destroy(true);
			await openOrbShop(
				[
					"crimson_orb",
					"emerald_orb",
					"azure_orb"
				]
			);
			PhaseManager.handlePhaseEnded();

		}
	},
	{
		name: "Improve: Damage",
		description: "Improve a damage hero",
		onClick: () => { }
	},
	{
		name: "Armory",
		description: "Choose a damage unit",
		onClick: openHeroShopCallback(container, "damage")
	},
	// {
	// 	name: "Healing Tent",
	// 	description: "Choose a healing unit",
	// 	onClick: openHeroShopCallback(container, "heal")
	// },
	// {
	// 	name: "Visit the Fort",
	// 	description: "Choose a shield unit",
	// 	onClick: openHeroShopCallback(container, "shield")
	// },
	// {
	// 	name: "Forest Pools",
	// 	description: "Choose a regen unit",
	// 	onClick: openHeroShopCallback(container, "regen")
	// },
	// {
	// 	name: "Toxic Chamber",
	// 	description: "Choose a poison unit",
	// 	onClick: openHeroShopCallback(container, "poison")
	// },
	// {
	// 	name: "Toxic Chamber",
	// 	description: "Choose a poison unit",
	// 	onClick: openHeroShopCallback(container, "poison")
	// },
	// {
	// 	name: "Trial Circuit",
	// 	description: "Choose a haste unit",
	// 	onClick: openHeroShopCallback(container, "haste")
	// },
	// {
	// 	name: "Trapper's Guild",
	// 	description: "Choose a guild unit",
	// 	onClick: openHeroShopCallback(container, "slow")
	// }
];

export async function open() {
	const container = io.Container();

	const index = encounterIndex(container);

	const encounters = pickRandom(index, 3);

	const nextRoundCallback = async () => {
		container.destroy(true);
		PhaseManager.handlePhaseEnded();
	}

	encounters.forEach((encounter, index) => {

		const x = SCREEN_WIDTH - 460;
		const y = 300 + index * 220;
		const padding = 20;

		const dimensions = size(450, 200);

		const bg = io.Rectangle(
			vec2(x, y),
			dimensions,
			0x1f1f1f,
			1
		);

		const title = io.Title2(encounter.name)
			.setPosition(
				x - dimensions.width / 2 + padding,
				y - dimensions.height / 2 + padding
			);

		const label = io.Label(encounter.description)
			.setPosition(
				x - dimensions.width / 2 + padding,
				y - dimensions.height / 2 + padding + 50
			);

		io.SetInteractiveRect(dimensions)(bg);

		io.OnPointerOver(bg, () => {
			io.Tween({
				targets: [bg],
				alpha: 0.8,
				duration: 400,
				ease: "Linear"
			});
		})

		io.OnPointerOut(bg, () => {
			io.Tween({
				targets: [bg],
				alpha: 1,
				duration: 400,
				ease: "Linear"
			});
		});

		io.OnPointerUp(bg, encounter.onClick);

		container.add([bg, title, label]);

	})

	createUIButton("Skip",
		vec2(SCREEN_WIDTH - 260, SCREEN_HEIGHT - 50),
		nextRoundCallback
	)

}

