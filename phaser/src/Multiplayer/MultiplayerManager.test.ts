import { MultiplayerManager } from './MultiplayerManager';
import { supabase } from "@lib/supabase";

// Mock Supabase
jest.mock("@lib/supabase", () => ({
	supabase: {
		auth: {
			getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
			signUp: jest.fn(),
			signInWithPassword: jest.fn(),
			signOut: jest.fn(),
		},
		functions: {
			invoke: jest.fn().mockResolvedValue({ data: {}, error: null }),
		},
		from: jest.fn(() => ({
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			maybeSingle: jest.fn(),
		})),
	},
}));

// Mock fetch
const fetchMock = jest.fn();
global.fetch = fetchMock;

describe('MultiplayerManager', () => {
	let manager: MultiplayerManager;

	beforeEach(() => {
		jest.clearAllMocks();
		// Reset instance for fresh tests (using any cast to access private/static)
		(MultiplayerManager as any).instance = undefined;
		manager = MultiplayerManager.getInstance();
		fetchMock.mockClear();
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
	it("should handle successful registration enabling email confirmation", async () => {
		const mockResponse = {
			data: {
				user: {
					id: "27a7fc46-b08a-432f-bd38-d44fa86389e5",
					aud: "authenticated",
					role: "authenticated",
					email: "lfarroco@gmail.com",
					app_metadata: { provider: "email" },
					user_metadata: { email: "lfarroco@gmail.com" },
					identities: [],
					created_at: "2026-01-10T23:03:05.584284Z",
					updated_at: "2026-01-10T23:03:06.929355Z",
				},
				session: null, // Session is null when email confirmation is required
			},
			error: null,
		};

		(supabase.auth.signUp as jest.Mock).mockResolvedValue(mockResponse);

		// We expect it to fail currently, essentially reproducing the issue if we check for the error
		// But the task is to fix it. So I should write the test creating the EXPECTED behavior (success)
		// and see it fail.

		const result = await manager.handleAuthRegister("lfarroco@gmail.com", "password123", "derpy");
		expect(result).toEqual({
			success: true,
			requiresConfirmation: true,
			user: expect.objectContaining({ email: "lfarroco@gmail.com" })
		});
	});
});
