import { MultiplayerManager } from './MultiplayerManager';

// Mock fetch
const fetchMock = jest.fn();
global.fetch = fetchMock;

describe('MultiplayerManager', () => {
	let manager: MultiplayerManager;

	beforeEach(() => {
		manager = MultiplayerManager.getInstance();
		fetchMock.mockClear();
		// Reset console spies if we used them?
	});

	it('should be disabled by default', () => {
		expect(manager.isMultiplayer).toBe(false);
	});

	it('should enable multiplayer and connect to server', async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ success: true })
		});

		await manager.enableMultiplayer();

		expect(manager.isMultiplayer).toBe(true);
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining('/multiplayer/connect'),
			expect.objectContaining({
				method: 'POST'
			})
		);
	});

	it('should disable multiplayer if connection fails', async () => {
		fetchMock.mockRejectedValueOnce(new Error('Network error'));

		await manager.enableMultiplayer();

		expect(manager.isMultiplayer).toBe(false);
	});

	it('should fetch phase options', async () => {
		const mockOptions = { phase: 'encounter', options: [] };
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => mockOptions
		});

		const options = await manager.getPhaseOptions({} as any);

		expect(options).toEqual(mockOptions);
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining('/multiplayer/state?playerId=')
		);
	});

	it('should send option selection', async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true
		});

		const result = await manager.sendOptionSelection('some_option');

		expect(result).toBe(true);
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining('/multiplayer/action'),
			expect.objectContaining({
				method: 'POST',
				body: expect.stringContaining('some_option')
			})
		);
	});
});
