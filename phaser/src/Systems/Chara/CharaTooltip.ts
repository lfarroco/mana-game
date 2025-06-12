import { GameEvents } from "../../constants/events";
import { Chara } from "./Chara";

export const onCharaPointerOver = ({ chara }: { chara: Chara }): void => {

	if (!chara.active || !chara.visible) return

	const title = chara.unit.name; // Or cardDef.name

	const description = [
		`Attack: ${chara.unit.attackPower} HP: ${chara.unit.hp}`,
		chara.unit.traits.map((trait) => trait.description).join("\n"),
	].join('\n');

	// Calculate absolute position of the Chara
	// Chara's x,y is its center relative to its parent (scene or a container like flyout).
	// We need its world coordinates.
	const worldMatrix = chara.getWorldTransformMatrix();
	const charaWorldX = worldMatrix.tx;
	const charaWorldY = worldMatrix.ty;

	// Tooltip positioning similar to RelicCard
	// Position tooltip to the right of the Chara.
	// The value 300 is used in Relic.ts, consider making this a shared constant.
	const TOOLTIP_OFFSET_X = 300;
	const tooltipX = charaWorldX + (chara.displayWidth / 2) + TOOLTIP_OFFSET_X;
	const tooltipY = charaWorldY; // Align with chara's vertical center

	chara.parent.events.emit(GameEvents.TOOLTIP_SHOW, {
		x: tooltipX,
		y: tooltipY,
		title: title,
		description: description,
	});
}

export const onCharaPointerOut = ({ chara }: { chara: Chara }): void => {
	chara.parent.events.emit(GameEvents.TOOLTIP_HIDE);
}