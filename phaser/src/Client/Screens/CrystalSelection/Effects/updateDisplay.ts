import { getName } from "@i18n/i18n";
import * as io from "@PhaserIO";
import { getCloudsBg } from "Client/Screens/Title/components/cloudsBg";
import { buildEffectBlock, getReactionDescription } from "@Systems/Chara/CharaTooltip";
import * as _ from "../CrystalSelectionScene";
import { CardDefinition } from "@Models/Entities/Card";
import { colorPresets } from "@Constants/colorPresets";
import { t } from "@i18n/i18n";
import * as paginationDots from "../Components/paginationDots"

const CLOUD_BG_ANIMATION_DURATION = 1500;
const CLOUD_BG_ANIMATION_EASE = "Sine.InOut";

export function updateDisplay() {
	const crystal = _.state.crystals[_.state.currentIndex];

	_.state.crystalSprite.setTexture(crystal.pic);

	_.state.crystalName.setText(getName(crystal.id));
	io.Centralize(_.state.crystalName);

	const description = buildCrystalDescription(crystal);
	_.state.descriptionText.setText(description);

	_.state.paginationDots.forEach((dot, i) => {
		dot.setFillStyle(
			paginationDots.PAGINATION_DOT_COLOR
			,
			i === _.state.currentIndex ? paginationDots.PAGINATION_DOT_ACTIVE_ALPHA : paginationDots.PAGINATION_DOT_INACTIVE_ALPHA
		);
	});

	const bg = getCloudsBg();
	if (bg) {
		const preset = getColorPresetForCrystal(crystal.id);
		bg.tweenToPreset(
			preset, CLOUD_BG_ANIMATION_DURATION, CLOUD_BG_ANIMATION_EASE,
		);
	}
}

export function getColorPresetForCrystal(crystalId: string): keyof typeof colorPresets {
	const colorMap: Record<string, keyof typeof colorPresets> = {
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
		.map((e) => buildEffectBlock(e, power))
		.filter((e): e is string => e !== null)
		.map((str) => "- " + str[0].toUpperCase() + str.slice(1));

	const reactionBlocks = crystal.reactions
		.map((r) => getReactionDescription(r, power))
		.map((str) => "- " + str);

	const cdAsSeconds = ((crystal.cooldown || 0) / 1000).toFixed(1);
	const statsBlock = `[color=#c0c0c0]${t("crystalSelection.cooldown")}[/color] [color=#ffa94d]${cdAsSeconds}s[/color]`;

	const lifeBlock = crystal.life
		? ` | [color=#c0c0c0]${t("crystalSelection.life")}[/color] [color=#51cf66]${crystal.life}[/color]`
		: "";

	const allEffects = [...effectBlocks, ...reactionBlocks].join("\n");

	return `${statsBlock}${lifeBlock}\n\n${allEffects || t("crystalSelection.noAbilities")}`;
}

