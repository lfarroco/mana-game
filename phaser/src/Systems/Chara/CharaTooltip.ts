import { GameEvents } from "../../constants/events";
import { getTraitDefinition } from "../../TraitSystem/TraitEffectSystem";
import { Chara } from "./Chara";
import { formatTraitDescription } from "./TraitTooltipFormatter";

export const onCharaPointerOver = ({ chara }: { chara: Chara }): void => {

	if (!chara.active || !chara.visible) return

	const title = chara.unit.name; // Or cardDef.name

	const traitDescriptions = chara.unit.traits.map(traitData => {
		const definition = getTraitDefinition(traitData.id);
		if (!definition) {
			return `[b]Unknown Trait:[/b] ${traitData.id}`;
		}
		return formatTraitDescription(definition, traitData, chara.unit);
	}).join('\n\n'); // Use double newline for better separation between traits

	const description = `Attack: ${chara.unit.power}\n\n${traitDescriptions}`;

	// Calculate absolute position of the Chara
	// Chara's x,y is its center relative to its parent (scene or a container like flyout).
	// We need its world coordinates.
	const worldMatrix = chara.getWorldTransformMatrix();
	const charaWorldX = worldMatrix.tx;
	const charaWorldY = worldMatrix.ty;

	// Position tooltip to the right of the Chara.
	const TOOLTIP_OFFSET_X = 300;
	const tooltipX = charaWorldX + (chara.displayWidth / 2) + TOOLTIP_OFFSET_X;
	const tooltipY = charaWorldY; // Align with chara's vertical center

	chara.scene.events.emit(GameEvents.TOOLTIP_SHOW, {
		x: tooltipX,
		y: tooltipY,
		title: title,
		description: description,
	});
}

export const onCharaPointerOut = ({ chara }: { chara: Chara }): void => {
	chara.scene.events.emit(GameEvents.TOOLTIP_HIDE);
}