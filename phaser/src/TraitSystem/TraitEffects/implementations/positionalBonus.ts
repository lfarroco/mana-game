import { TraitEffectFn } from "../../TraitEffectSystem";
import { getChara } from "../../../Scenes/Battleground/Systems/CharaManager";
import { playerForce } from "../../../Models/Entities/Force";

/**
 * Effect: Applies a positional bonus to a unit if it is in the correct row.
 */
export const positionalBonusLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, effectInstance, traitInstanceParams } = context;

	// Configurable parameters from trait data
	const attribute = (traitInstanceParams.attribute ?? effectInstance.attribute) as keyof typeof sourceUnit;
	const amount = (traitInstanceParams.amount ?? effectInstance.amount ?? 0) as number;
	const row = (traitInstanceParams.row ?? effectInstance.row) as 'front' | 'mid' | 'back';

	if (!attribute || amount === 0 || !row) {
		if (process.env.NODE_ENV === 'development') {
			console.error(`Positional bonus effect for unit ${sourceUnit.id} is missing required parameters (attribute, amount, row).`, { attribute, amount, row });
		}
		return;
	}

	const boardHeightInTiles = 3; // Standard 3x3 board
	const backRowY = boardHeightInTiles - 1;
	const midRowY = 1;
	const frontRowY = 0;

	let isCorrectRow = false;
	const unitY = sourceUnit.position.y;

	if (sourceUnit.force === playerForce.id) {
		if (row === 'back' && unitY === backRowY) isCorrectRow = true;
		if (row === 'mid' && unitY === midRowY) isCorrectRow = true;
		if (row === 'front' && unitY === frontRowY) isCorrectRow = true;
	} else { // CPU force
		if (row === 'back' && unitY === frontRowY) isCorrectRow = true; // CPU back is at y=0
		if (row === 'mid' && unitY === midRowY) isCorrectRow = true;
		if (row === 'front' && unitY === backRowY) isCorrectRow = true; // CPU front is at y=2
	}

	if (isCorrectRow) {
		const chara = getChara(sourceUnit.id);
		if (!chara) return;
		// updateUnitAttribute handles data update, display refresh, and popText
		await chara.updateUnitAttribute(attribute, amount);
	}
};
