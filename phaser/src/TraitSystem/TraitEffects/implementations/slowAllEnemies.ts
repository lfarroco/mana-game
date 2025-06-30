import { TraitEffectFn } from '../../TraitEffectSystem';
import { getEffectParams } from '../../TraitSystem.pure';

/**
 * Pure function for slowing all enemies
 */
export function slowAllEnemiesLogic(
    targets: any[],
    duration: number
): {
    targets: any[];
    duration: number;
    modifier: number;
    message: string;
} {
    return {
        targets,
        duration,
        modifier: 1.5,
        message: "Slowed!"
    };
}

/**
 * Runtime wrapper for slow all enemies effect
 */
export const slowAllEnemies: TraitEffectFn = async (context) => {
    const { getChara } = await import('../../../Scenes/Battleground/Systems/CharaManager');
    const { applyStatusEffect } = await import('../../../Systems/StatusEffects/StatusEffectManager');
    
    const { targets, scene } = context;
    const duration = getEffectParams(context.traitInstanceParams, context.effectInstance, 'duration', 2500);

    const result = slowAllEnemiesLogic(targets, duration);
    
    // Apply the temporary cooldown modification directly
    for (const target of result.targets) {
        const chara = getChara(target.id);
        if (chara) {
            applyStatusEffect(target, {
                type: 'slow',
                remainingDuration: result.duration,
                cooldownMultiplier: result.modifier,
                displayName: 'Slowed'
            });

            // Show pop text only if scene is active
            if (chara && chara.active && scene && scene.scene && scene.scene.isActive()) {
                await chara.showPopText(result.message, undefined);
            }
        }
    }
};
