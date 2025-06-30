import { performSkillHealLogic } from './performSkillHeal';
import { TraitEffectContext } from '../../TraitEffectSystem';

describe('performSkillHeal', () => {
    let mockContext: TraitEffectContext;
    let mockHealing: jest.Mock;
    let mockScene: any;
    let mockSourceUnit: any;

    beforeEach(() => {
        mockSourceUnit = {
            id: 'test-unit',
            name: 'Test Unit',
            hp: 50,
            maxHp: 100
        };

        mockScene = {
            state: {
                battleData: {
                    forces: []
                }
            }
        };

        mockHealing = jest.fn().mockReturnValue(jest.fn().mockResolvedValue(undefined));

        mockContext = {
            sourceUnit: mockSourceUnit,
            scene: mockScene,
            targets: [mockSourceUnit],
            state: mockScene.state,
            traitInstanceParams: {},
            effectInstance: {},
            traitDefinition: { id: 'test-trait', name: 'Test Trait', effects: [] }
        } as unknown as TraitEffectContext;
    });

    it('should call the healing skill with the source unit', async () => {
        await performSkillHealLogic(mockContext, mockHealing);

        expect(mockHealing).toHaveBeenCalledWith(mockScene);
        expect(mockHealing(mockScene)).toHaveBeenCalledWith(mockSourceUnit);
    });

    it('should handle the skill execution properly', async () => {
        const mockSkillExecution = jest.fn().mockResolvedValue(undefined);
        const mockHealingSkill = jest.fn().mockReturnValue(mockSkillExecution);

        await performSkillHealLogic(mockContext, mockHealingSkill);

        expect(mockHealingSkill).toHaveBeenCalledWith(mockScene);
        expect(mockSkillExecution).toHaveBeenCalledWith(mockSourceUnit);
    });
});
