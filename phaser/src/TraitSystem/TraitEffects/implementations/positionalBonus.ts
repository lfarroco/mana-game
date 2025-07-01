/**
 * @file Positional Bonus trait effect implementation
 * Effect: Applies a bonus to a unit if it is in the correct row (front, mid, or back).
 */

import { TraitEffectFn, TraitEffectContext } from "../../TraitEffectSystem";
import { getEffectParams } from "../../TraitSystem.pure";
import { Unit } from "../../../Models/Entities/Unit";

export interface PositionalBonusParams {
	attribute: keyof Unit;
	amount: number;
	row: 'front' | 'mid' | 'back';
}

export interface PositionalBonusState {
	sourceUnit: Unit;
	playerForceId: string;
	boardHeightInTiles?: number;
}

/**
 * Pure function to determine if a unit should receive positional bonus
 */
export function positionalBonusLogicPure(
	params: PositionalBonusParams,
	state: PositionalBonusState
): { shouldApplyBonus: boolean; attribute: keyof Unit; amount: number } {
	const { attribute, amount, row } = params;
	const { sourceUnit, playerForceId, boardHeightInTiles = 3 } = state;

	// Validate parameters
	if (!attribute || amount === 0 || !row) {
		return { shouldApplyBonus: false, attribute, amount };
	}

	const backRowY = boardHeightInTiles - 1;
	const midRowY = 1;
	const frontRowY = 0;
	const unitY = sourceUnit.position.y;

	let isCorrectRow = false;

	if (sourceUnit.force === playerForceId) {
		// Player force positioning
		if (row === 'back' && unitY === backRowY) isCorrectRow = true;
		if (row === 'mid' && unitY === midRowY) isCorrectRow = true;
		if (row === 'front' && unitY === frontRowY) isCorrectRow = true;
	} else {
		// Enemy force positioning (inverted)
		if (row === 'back' && unitY === frontRowY) isCorrectRow = true; // Enemy back is at y=0
		if (row === 'mid' && unitY === midRowY) isCorrectRow = true;
		if (row === 'front' && unitY === backRowY) isCorrectRow = true; // Enemy front is at y=2
	}

	return {
		shouldApplyBonus: isCorrectRow,
		attribute,
		amount
	};
}

/**
 * Runtime wrapper for positional bonus trait effect
 */
export const positionalBonusLogic: TraitEffectFn = async (context: TraitEffectContext) => {
	const { getChara } = await import("../../../Scenes/Battleground/Systems/CharaManager");
	const { playerForce } = await import("../../../Models/Entities/Force");

	const { sourceUnit } = context;

	// Extract parameters using the getEffectParams utility
	const attribute = getEffectParams(context.traitInstanceParams, context.effectInstance, 'attribute', 'power') as keyof Unit;
	const amount = getEffectParams(context.traitInstanceParams, context.effectInstance, 'amount', 0);
	const row = getEffectParams(context.traitInstanceParams, context.effectInstance, 'row', 'back') as 'front' | 'mid' | 'back';

	// Validate that we have a valid attribute
	if (!attribute || amount === 0 || !row) {
		return;
	}

	const result = positionalBonusLogicPure(
		{ attribute, amount, row },
		{ sourceUnit, playerForceId: playerForce.id }
	);

	if (result.shouldApplyBonus) {
		const chara = getChara(sourceUnit.id);
		if (!chara) return;
		// updateUnitAttribute handles data update, display refresh, and popText
		await chara.updateUnitAttribute(result.attribute, result.amount);
	}
};
