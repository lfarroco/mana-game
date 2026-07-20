import * as i18n from "@i18n/i18n";
import * as cloudsBg from "../../../Screens/Title/Components/cloudsBg";
import * as CharaTooltip from "@Systems/Chara/CharaTooltip";
import * as parent from "../CrystalSelectionScreen";
import * as colorPresets from "@Components/CloudsBackground/colorPresets";
import * as paginationDots from "../Components/paginationDots"
import { CardDefinition } from "@game/Models";

const CLOUD_BG_ANIMATION_DURATION = 1500;
const CLOUD_BG_ANIMATION_EASE = "Sine.InOut";

export function updateDisplay() {
	const crystal = parent.state.crystals[parent.state.currentIndex];

	parent.state.crystalSprite.setTexture(crystal.pic);

	parent.state.crystalName.setText(i18n.getName(crystal.id));
	io.Centralize(parent.state.crystalName);

	const description = buildCrystalDescription(crystal);
	parent.state.descriptionText.setText(description);

	parent.state.paginationDots.forEach((dot, i) => {
		dot.setFillStyle(
			paginationDots.PAGINATION_DOT_COLOR
			,
			i === parent.state.currentIndex ? paginationDots.PAGINATION_DOT_ACTIVE_ALPHA : paginationDots.PAGINATION_DOT_INACTIVE_ALPHA
		);
	});

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

