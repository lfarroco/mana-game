import * as PhaseManager from "@Scenes/Battleground/PhaseManager";
import * as io from "@PhaserIO";
import { createUIButton } from "@Components/UIButton";
import { size, vec2 } from "@Models/Geometry";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "@Constants/constants";
import { openHeroShop } from "./Shop/HeroShop";
import { pickRandom } from "utils";
import { openOrbShop } from "./Shop/OrbShop";
import { getState } from "@Models/State";

const openHeroShopCallback = (container: Phaser.GameObjects.Container, type: string) => async () => {
	container.destroy(true);
	await openHeroShop(
		(card) => card.effects.some(eff => eff.id === type)
	);
	PhaseManager.handlePhaseEnded();
}

type EncounterItem = {
	name: string;
	description: string;
	onClick: () => Promise<void>;
	minRound?: number;
};

const encounterIndex = (container: Phaser.GameObjects.Container): EncounterItem[] => [
	{
		name: "Upgrade Unit",
		description: "Upgrade a unit",
		onClick: orbShopCallback(container, ["upgrade_orb"])
	},
	improveType(container, "damage"),
	improveType(container, "heal"),
	improveType(container, "shield"),
	improveType(container, "poison"),
	improveType(container, "regen"),
	{
		name: "Armory",
		description: "Choose a damage unit",
		onClick: openHeroShopCallback(container, "damage")
	},
	{
		name: "Healing Tent",
		description: "Choose a healing unit",
		onClick: openHeroShopCallback(container, "heal")
	},
	{
		name: "Frontier Fort",
		description: "Choose a shield unit",
		onClick: openHeroShopCallback(container, "shield")
	},
	{
		name: "Forest Pools",
		description: "Choose a regen unit",
		onClick: openHeroShopCallback(container, "regen")
	},
	{
		name: "Toxic Chamber",
		description: "Choose a poison unit",
		onClick: openHeroShopCallback(container, "poison")
	},
	{
		name: "Trial Circuit",
		description: "Choose a haste unit",
		onClick: openHeroShopCallback(container, "haste")
	},
	{
		name: "Trapper's Guild",
		description: "Choose a slow unit",
		onClick: openHeroShopCallback(container, "slow")
	},
	{
		name: "Thunder Spire",
		description: "Choose a charge unit",
		onClick: openHeroShopCallback(container, "charge")
	},
	{
		name: "Commander's Tent",
		description: "Choose a buffer unit",
		onClick: openHeroShopCallback(container, "increase_power")
	},
	{
		name: "Assassin's Hideout",
		description: "Choose a critical strike unit",
		onClick: openHeroShopCallback(container, "increase_critical")
	},
	{
		name: "Power Distributor",
		description: "Distribute power to allies",
		minRound: 3,
		onClick: orbShopCallback(container, ["distribute_power_orb"])
	},
	{
		name: "Power Absorber",
		description: "Absorb power from allies",
		minRound: 3,
		onClick: orbShopCallback(container, ["absorb_power_orb"])
	},
	{
		name: "Dark Ritual",
		description: "Sacrifice effect for power",
		onClick: orbShopCallback(container, ["sacrifice_effect_orb"])
	},
	improveType(container, "haste"),
	improveType(container, "slow"),
	improveType(container, "charge"),
];

function improveType(container: Phaser.GameObjects.Container, type: string) {
	return {
		name: `Improve: ${type}`,
		minRound: 4,
		description: `Improve a ${type} hero`,
		onClick: orbShopCallback(container, [
			`increase_power_on_${type}`,
			`decrease_cooldown_on_${type}`,
			`increase_critical_on_${type}`
		])
	};
}

function orbShopCallback(container: Phaser.GameObjects.Container, orbs: string[]) {
	return async () => {
		container.destroy(true);
		await openOrbShop(orbs);
		PhaseManager.handlePhaseEnded();
	};
}

export async function open() {
	const container = io.Container();

	const index = encounterIndex(container).filter(e => {

		if (e.minRound) {
			return e.minRound <= getState().gameData.round;
		}

		return true;
	})

	const encounters = pickRandom(index, 3)

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
				alpha: 0.4,
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

	});

	const btn = createUIButton("Skip",
		vec2(SCREEN_WIDTH - 260, SCREEN_HEIGHT - 50),
		nextRoundCallback
	);

	container.add(btn.container);

}

