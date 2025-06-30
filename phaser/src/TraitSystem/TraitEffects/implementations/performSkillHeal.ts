import { TraitEffectFn, TraitEffectContext } from "../../TraitEffectSystem";

// Pure function for testing
export function performSkillHealLogic(
    context: TraitEffectContext,
    healingSkillFn?: (scene: any) => (unit: any) => Promise<void>
): Promise<void> {
    return new Promise(async (resolve) => {
        const { sourceUnit, scene } = context;
        
        // Use provided skill function or import dynamically to avoid circular deps
        let healing;
        if (healingSkillFn) {
            healing = healingSkillFn;
        } else {
            const { healing: healingImport } = await import("../../../Systems/Chara/Skills/healing");
            healing = healingImport;
        }
        
        await healing(scene)(sourceUnit);
        
        resolve();
    });
}

// Runtime wrapper
export const performSkillHeal: TraitEffectFn = async (context: TraitEffectContext) => {
    return performSkillHealLogic(context);
};
