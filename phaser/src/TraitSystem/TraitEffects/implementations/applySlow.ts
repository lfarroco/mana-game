/**
 * @file Apply Slow trait effect implementation
 * This effect applies slow to targets by adding duration to their slowed property.
 */

import { TraitEffectFn } from '../../TraitEffectSystem';
import { getEffectParams } from '../../TraitSystem.pure';
import { slowEffect } from '../../../Effects/slowEffect';
import * as CharaManager from '../../../Scenes/Battleground/Systems/CharaManager';

/**
 * Pure function to create the apply slow effect implementation
 * @returns The trait effect function
 */
export function createApplySlowLogic(): TraitEffectFn {
	return async (context) => {
		const { targets, scene } = context;
		const duration = getEffectParams(context.traitInstanceParams, context.effectInstance, 'duration', 2000);

		for (const target of targets) {
			// Add slow duration to the unit's slowed property
			target.slowed += duration;

			// Show a brief visual effect when slow is applied
			if (scene) {
				const chara = CharaManager.getChara(target.id);
				if (chara) {
					// Show a burst effect when slow is applied
					await slowEffect(scene, { x: chara.x, y: chara.y }, {
						duration: 1000,
						intensity: 1.5,
						color: 0xD2691E // Orange-brownish color
					});
				}
			}
		}
	};
}

/**
 * Apply slow effect implementation for runtime use
 * This is the actual implementation registered with the TraitEffectSystem
 */
export const applySlowLogicIO: TraitEffectFn = async (context) => {
	// Dynamically import to avoid circular dependencies

	const impl = createApplySlowLogic();
	return impl(context);
};
