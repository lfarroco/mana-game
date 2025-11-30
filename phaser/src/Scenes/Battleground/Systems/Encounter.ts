import * as PhaseManager from "@Scenes/Battleground/PhaseManager";
import * as io from "@PhaserIO";
import { createUIButton } from "@Components/UIButton";
import { size, vec2 } from "@Models/Geometry";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "@Constants/constants";
import { openHeroShop } from "./Shop/HeroShop";
import { pickRandom } from "utils";
import { openOrbShop } from "./Shop/OrbShop";
import { getState } from "@Models/State";
import { playSoundEffect } from "@Systems/AudioManager";

const openHeroShopCallback = (container: Phaser.GameObjects.Container, type: string) => async () => {
	container.destroy(true);
	await openHeroShop(
		(card) => card.effects.some(eff => eff.id === type)
	);
	PhaseManager.handlePhaseEnded();
}

type EncounterItem = {
	name: string;
	pic: string;
	description: string;
	onClick: () => Promise<void>;
	minRound?: number;
};

const encounterIndex = (container: Phaser.GameObjects.Container): EncounterItem[] => [
	{
		name: "Upgrade Unit",
		pic: "ui/upgrade_unit",
		description: "Upgrade a unit",
		onClick: orbShopCallback(container, ["upgrade_orb"])
	},
	improveType(container, "ui/improve_damage", "damage"),
	improveType(container, "ui/improve_heal", "heal"),
	improveType(container, "ui/improve_shield", "shield"),
	improveType(container, "ui/toxic", "poison"),
	improveType(container, "ui/improve_regen", "regen"),
	{
		name: "Armory",
		pic: "ui/armory",
		description: "Choose a damage unit",
		onClick: openHeroShopCallback(container, "damage")
	},
	{
		name: "Healing Tent",
		pic: "ui/improve_heal",
		description: "Choose a healing unit",
		onClick: openHeroShopCallback(container, "heal")
	},
	{
		name: "Frontier Fort",
		pic: "ui/frontier_fort",
		description: "Choose a shield unit",
		onClick: openHeroShopCallback(container, "shield")
	},
	{
		name: "Forest Pools",
		pic: "ui/forest_pools",
		description: "Choose a regen unit",
		onClick: openHeroShopCallback(container, "regen")
	},
	{
		name: "Toxic Chamber",
		pic: "ui/toxic",
		description: "Choose a poison unit",
		onClick: openHeroShopCallback(container, "poison")
	},
	{
		name: "Trial Circuit",
		pic: "ui/trial_circuit",
		description: "Choose a haste unit",
		onClick: openHeroShopCallback(container, "haste")
	},
	{
		name: "Trapper's Guild",
		pic: "ui/improve_slow",
		description: "Choose a slow unit",
		onClick: openHeroShopCallback(container, "slow")
	},
	{
		name: "Thunder Spire",
		pic: "ui/thunder_spire",
		description: "Choose a charge unit",
		onClick: openHeroShopCallback(container, "charge")
	},
	{
		name: "Commander's Tent",
		pic: "ui/commander",
		description: "Choose a buffer unit",
		onClick: openHeroShopCallback(container, "increase_power")
	},
	{
		name: "Assassin's Hideout",
		pic: "ui/assassin",
		description: "Choose a critical strike unit",
		onClick: openHeroShopCallback(container, "increase_critical")
	},
	{
		name: "Power Distributor",
		pic: "ui/power_distributor",
		description: "Distribute power to allies",
		minRound: 3,
		onClick: orbShopCallback(container, ["distribute_power_orb"])
	},
	{
		name: "Power Absorber",
		pic: "ui/power_absorber",
		description: "Absorb power from allies",
		minRound: 3,
		onClick: orbShopCallback(container, ["absorb_power_orb"])
	},
	{
		name: "Dark Ritual",
		pic: "ui/dark_ritual",
		description: "Sacrifice effect for power",
		onClick: orbShopCallback(container, ["sacrifice_effect_orb"])
	}
];

function improveType(container: Phaser.GameObjects.Container, pic: string, type: string) {
	return {
		name: `Improve: ${type}`,
		pic,
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
		const padding = 70;

		const dimensions = size(450, 200);

		const bg = io.Rectangle(
			vec2(x, y),
			dimensions,
			0x1f1f1f,
			1
		);

		const icon = io
			.Image(encounter.pic)
			.setDisplaySize(128, 128)
			.setPosition(
				x - dimensions.width / 2 + padding,
				y - dimensions.height / 2 + padding + 70
			);

		io.Tween({
			targets: [icon],
			repeat: -1,
			duration: 200 * Math.random() + 2000,
			ease: "Linear",
			yoyo: true,
			y: {
				from: y - dimensions.height / 2 + padding + 30,
				to: y - dimensions.height / 2 + padding + 30 + 10
			}
		})

		const title = io.Title2(encounter.name)
			.setPosition(
				x - dimensions.width / 2 + padding + 100,
				y - dimensions.height / 2 + padding
			);

		const label = io.Label(encounter.description)
			.setPosition(
				x - dimensions.width / 2 + padding + 100,
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

		io.OnPointerUp(bg, () => {
			playSoundEffect('sfx_unit_run_magical_4');
			encounter.onClick();
		});

		container.add([bg, icon, title, label]);

	});

	const btn = createUIButton("Skip",
		vec2(SCREEN_WIDTH - 260, SCREEN_HEIGHT - 50),
		nextRoundCallback
	);

	container.add(btn.container);

}

