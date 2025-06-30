/**
 * @file Deal Damage trait effect implementation
 * This effect deals direct damage to targets and shows damage pop text.
 */

import { TraitEffectFn } from '../../TraitEffectSystem';
import { getEffectParams } from '../../TraitSystem.pure';

/**
 * Pure function to create the deal damage effect implementation
 * @param getCharaFn - Pure function to get character by ID
 * @returns The trait effect function
 */
export function createDealDamageLogic(
	getCharaFn: (id: string) => any
): TraitEffectFn {
	return async (context) => {
		const { targets } = context;
		const amount = getEffectParams(context.traitInstanceParams, context.effectInstance, 'amount', 0);

		for (const target of targets) {
			const charaTarget = getCharaFn(target.id);
			await charaTarget?.showPopText(`-${amount} Dmg`, "damage");
		}
	};
}

/**
 * Deal damage effect implementation for runtime use
 * This is the actual implementation registered with the TraitEffectSystem
 */
export const dealDamageLogic: TraitEffectFn = async (context) => {
	// In runtime, we import the actual getChara function
	const { getChara } = await import('../../../Scenes/Battleground/Systems/CharaManager');
	const impl = createDealDamageLogic(getChara);
	return impl(context);
};
