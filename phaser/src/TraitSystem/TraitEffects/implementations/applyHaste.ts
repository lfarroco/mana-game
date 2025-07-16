/**
 * @file Apply Haste trait effect implementation
 * This effect applies haste to targets by adding duration to their hasted property.
 */

import { TraitEffectFn } from '../../TraitEffectSystem';
import { getEffectParams } from '../../TraitSystem.pure';
import { hasteEffect } from '../../../Effects/hasteEffect';
import * as CharaManager from '../../../Scenes/Battleground/Systems/CharaManager';

/**
 * Pure function to create the apply haste effect implementation
 * @returns The trait effect function
 */
export function createApplyHasteLogic(): TraitEffectFn {
	return async (context) => {
		const { targets, scene } = context;
		const duration = getEffectParams(context.traitInstanceParams, context.effectInstance, 'duration', 2000);

		for (const target of targets) {
			// Add haste duration to the unit's hasted property
			target.hasted += duration;

			// Show a brief visual effect when haste is applied
			if (scene) {
				const chara = CharaManager.getChara(target.id);
				if (chara) {
					// Show a burst effect when haste is applied
					await hasteEffect(scene, { x: chara.x, y: chara.y }, {
						duration: 1000,
						intensity: 1.5,
						color: 0x00eaff
					});
				}
			}
		}
	};
}

/**
 * Apply haste effect implementation for runtime use
 * This is the actual implementation registered with the TraitEffectSystem
 */
export const applyHasteLogicIO: TraitEffectFn = async (context) => {
	// Dynamically import to avoid circular dependencies

	const impl = createApplyHasteLogic();
	return impl(context);
};
