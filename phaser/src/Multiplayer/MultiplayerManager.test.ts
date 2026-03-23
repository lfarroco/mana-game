import {
	isMultiplayer,
	enableMultiplayer,
	disableMultiplayer,
	getPhaseOptions,
	sendOptionSelection,
	primeDeferredSession,
	handleAuthRegister,
	checkActiveSession,
} from "@Multiplayer/MultiplayerManager";
import { supabase } from "@lib/supabase";
import { State } from "@Models/State";
import { RunActionQueue } from "@Core/RunActionQueue";

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
			single: jest.fn().mockResolvedValue({ data: null, error: null }),
			maybeSingle: jest.fn(),
		})),
	},
}));

describe("MultiplayerManager", () => {
	beforeEach(() => {
		disableMultiplayer();
		localStorage.clear();
		jest.clearAllMocks();
	});

	it("should be disabled by default", () => {
		expect(isMultiplayer).toBe(false);
	});

	it("should enable multiplayer", async () => {
		await enableMultiplayer();

		expect(isMultiplayer).toBe(true);
	});

	it("should fetch phase options", async () => {
		const mockSession = {
			phase: "encounter",
			round: 1,
			current_options: [],
			team: { units: [] },
			wins: 0,
			losses: 0,
			seed: 123,
		};

		const singleMock = jest.fn().mockResolvedValue({ data: mockSession, error: null });
		(supabase.from as jest.Mock).mockReturnValue({
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			maybeSingle: singleMock,
			single: singleMock,
		});

		const options = await getPhaseOptions({} as State);

		expect(options.phase).toBe("encounter");
		expect(options.options).toEqual([]);
		expect(supabase.from).toHaveBeenCalledWith("player_sessions");
	});

	it("should send option selection", async () => {
		(supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({ data: {}, error: null });

		const result = await sendOptionSelection("some_option");

		expect(result).toBe(true);
		expect(supabase.functions.invoke).toHaveBeenCalledWith("action", {
			body: { actionId: "some_option" },
		});
	});

	it("should not append invalid deferred actions to the run manifest", async () => {
		const appendSpy = jest.spyOn(RunActionQueue.prototype, "append");

		await enableMultiplayer("crystal_core");

		primeDeferredSession({
			id: "sess-1",
			player_id: "player-1",
			phase: "encounter",
			round: 1,
			step: 1,
			seed: "seed-1",
			initial_seed: "seed-1",
			current_options: { options: [{ id: "forest_pools" }] },
			team: { units: [] },
			wins: 0,
			losses: 0,
			action_log: [],
		});

		const success = await sendOptionSelection("power_distributor");

		expect(success).toBe(false);
		expect(appendSpy).not.toHaveBeenCalled();

		appendSpy.mockRestore();
	});

	it("should treat a persisted non-terminal deferred session as active", async () => {
		await enableMultiplayer("crystal_core");

		primeDeferredSession({
			id: "sess-1",
			player_id: "player-1",
			phase: "shop",
			round: 1,
			step: 1,
			seed: "seed-1",
			initial_seed: "seed-1",
			current_options: { options: [{ id: "card_a" }] },
			team: { units: [{ id: "core-1", isCore: true }] },
			wins: 0,
			losses: 0,
			action_log: [],
		});

		const isActive = await checkActiveSession();

		expect(isActive).toBe(true);
	});

	it("should treat persisted terminal deferred session as inactive", async () => {
		await enableMultiplayer("crystal_core");

		primeDeferredSession({
			id: "sess-1",
			player_id: "player-1",
			phase: "victory",
			round: 10,
			step: 1,
			seed: "seed-1",
			initial_seed: "seed-1",
			current_options: { options: [] },
			team: { units: [{ id: "core-1", isCore: true }] },
			wins: 10,
			losses: 0,
			action_log: [],
		});

		const isActive = await checkActiveSession();

		expect(isActive).toBe(false);
	});

	it("should return false when there is no persisted deferred session", async () => {
		const isActive = await checkActiveSession();

		expect(isActive).toBe(false);
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

		const result = await handleAuthRegister("lfarroco@gmail.com", "password123", "derpy");
		expect(result).toEqual({
			success: true,
			requiresConfirmation: true,
			user: expect.objectContaining({ email: "lfarroco@gmail.com" }),
		});
	});
});
