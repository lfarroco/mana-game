import * as i18n from "@i18n/i18n";
import * as cloudsBg from "../../../Screens/Title/Components/cloudsBg";
import * as CharaTooltip from "@Components/Chara/CharaTooltip";
import * as colorPresets from "@Components/CloudsBackground/colorPresets";
import * as paginationDots from "../Components/paginationDots"
import { CardDefinition } from "@game/Models";
import { findTrackedById } from "@mana/framework";
import { CRYSTAL_IDS, paginationDotId } from "../ids";

const CLOUD_BG_ANIMATION_DURATION = 1500;
const CLOUD_BG_ANIMATION_EASE = "Sine.InOut";


// TODO: recreate the phase, instead of updating elements
// will allow not relying on element ids

export function updateDisplay(crystals: CardDefinition[], currentIndex: number) {
	const crystal = crystals[currentIndex];

	const sprite = findTrackedById<Phaser.GameObjects.Image>(CRYSTAL_IDS.sprite);
	if (sprite) sprite.setTexture(crystal.pic);

	const nameText = findTrackedById<Phaser.GameObjects.Text>(CRYSTAL_IDS.name);
	if (nameText) {
		nameText.setText(i18n.getName(crystal.id));
		nameText.setOrigin(0.5);
	}

	const descText = findTrackedById<import("phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText").default>(
		CRYSTAL_IDS.description
	);
	if (descText) {
		descText.setText(buildCrystalDescription(crystal));
	}

	// Pagination dots
	for (let i = 0; i < crystals.length; i++) {
		const dot = findTrackedById<Phaser.GameObjects.Arc>(paginationDotId(i));
		if (dot) {
			dot.setFillStyle(
				paginationDots.PAGINATION_DOT_COLOR,
				i === currentIndex ? paginationDots.PAGINATION_DOT_ACTIVE_ALPHA : paginationDots.PAGINATION_DOT_INACTIVE_ALPHA
			);
		}
	}

	const bg = cloudsBg.getCloudsBg();
	if (bg) {
		const preset = getColorPresetForCrystal(crystal.id);
		bg.tweenToPreset(
			preset, CLOUD_BG_ANIMATION_DURATION, CLOUD_BG_ANIMATION_EASE,
		);
	}
}

export function getColorPresetForCrystal(crystalId: string): keyof typeof colorPresets.colorPresets {
	const colorMap: Record<string, keyof typeof colorPresets.colorPresets> = {
		mana_crystal: "nebula",
		critical_crystal: "sunset",
		protective_crystal: "sunset",
		growth_crystal: "forest",
		purple_crystal: "aurora",
		quickstone: "sea",
	};

	return colorMap[crystalId] || "nebula";
}



function buildCrystalDescription(crystal: CardDefinition): string {
	const power = crystal.power || 0;

	const effectBlocks = crystal.effects
		.map((e) => CharaTooltip.buildEffectBlock(e, power))
		.filter((e): e is string => e !== null)
		.map((str) => "- " + str[0].toUpperCase() + str.slice(1));

	const reactionBlocks = crystal.reactions
		.map((r) => CharaTooltip.getReactionDescription(r, power))
		.map((str) => "- " + str);

	const cdAsSeconds = ((crystal.cooldown || 0) / 1000).toFixed(1);
	const statsBlock = `[color=#c0c0c0]${i18n.t("crystalSelection.cooldown")}[/color] [color=#ffa94d]${cdAsSeconds}s[/color]`;

	const lifeBlock = crystal.life
		? ` | [color=#c0c0c0]${i18n.t("crystalSelection.life")}[/color] [color=#51cf66]${crystal.life}[/color]`
		: "";

	const allEffects = [...effectBlocks, ...reactionBlocks].join("\n");

	return `${statsBlock}${lifeBlock}\n\n${allEffects || i18n.t("crystalSelection.noAbilities")}`;
}


