import { handleMultiplayerPhase } from './MultiplayerPhaseManager';
import { MultiplayerManager } from '../../Multiplayer/MultiplayerManager';
import * as Encounter from './Systems/Encounter';
import * as HeroShop from './Systems/Shop/HeroShop';

// Mock dependencies with factories
jest.mock('../../Multiplayer/MultiplayerManager', () => ({
	MultiplayerManager: {
		getInstance: jest.fn()
	}
}));
jest.mock('./Systems/Encounter', () => ({
	open: jest.fn()
}));
jest.mock('./Systems/Shop/HeroShop', () => ({
	openHeroShop: jest.fn()
}));
jest.mock('./Systems/Shop/EffectCardShop', () => ({
	openUpgradeCorePhase: jest.fn()
}));
jest.mock('./PhaseManager', () => ({
	// Mock whatever might be needed if implicitly loaded
}));

describe('MultiplayerPhaseManager', () => {
	let mockGetPhaseOptions: jest.Mock;

	beforeEach(() => {
		// Setup MultiplayerManager mock
		mockGetPhaseOptions = jest.fn();
		(MultiplayerManager.getInstance as jest.Mock).mockReturnValue({
			getPhaseOptions: mockGetPhaseOptions
		});

		jest.clearAllMocks();
	});

	it('should handle encounter phase', async () => {
		mockGetPhaseOptions.mockResolvedValue({
			phase: 'encounter',
			options: [{ id: 'opt1' }, { id: 'opt2' }]
		});

		const state: any = {};
		await handleMultiplayerPhase(state);

		expect(Encounter.open).toHaveBeenCalledWith(state, ['opt1', 'opt2']);
	});

	it('should handle shop phase', async () => {
		mockGetPhaseOptions.mockResolvedValue({
			phase: 'shop',
			options: [{ id: 'card1' }, { id: 'card2' }]
		});

		const state: any = {};
		// Since HeroShop uses named exports, we mocked it above.
		// openHeroShop signature: (filter, total, serverIds)
		await handleMultiplayerPhase(state);

		expect(HeroShop.openHeroShop).toHaveBeenCalledWith(undefined, undefined, ['card1', 'card2']);
	});

	// We can add tests for other phases similarly
});
