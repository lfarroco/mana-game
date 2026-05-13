import {
	isMultiplayer,
	enableMultiplayer,
	disableMultiplayer,
	getPhaseOptions,
	sendOptionSelection,
	primeDeferredSession,
	handleAuthRegister,
	handleGuestAccountUpgrade,
	handleRegisteredAccountUpdate,
	checkActiveSession,
	checkActiveSessionByType,
} from "@Multiplayer/MultiplayerManager";
import { createInitialSession } from "@Core/SessionManagement";
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
			signInAnonymously: jest.fn(),
			updateUser: jest.fn(),
			signOut: jest.fn(),
		},
		functions: {
			invoke: jest.fn().mockResolvedValue({ data: {}, error: null }),
		},
		from: jest.fn(() => ({
			select: jest.fn().mockReturnThis(),
			upsert: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			single: jest.fn().mockResolvedValue({ data: null, error: null }),
			maybeSingle: jest.fn(),
		})),
	},
}));

const createDeferredCoreTeam = (playerId: string, seed: string) =>
	createInitialSession(playerId, "crystal_core", seed).team;

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
			team: createDeferredCoreTeam("player-1", "seed-1"),
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
			team: createDeferredCoreTeam("player-1", "seed-1"),
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

	it("should keep casual and ranked deferred sessions isolated", async () => {
		await enableMultiplayer("crystal_core", "casual");
		primeDeferredSession({
			id: "sess-casual",
			player_id: "player-1",
			session_type: "multiplayer_casual",
			phase: "shop",
			round: 2,
			step: 1,
			seed: "seed-casual",
			initial_seed: "seed-casual",
			current_options: { options: [{ id: "card_a" }] },
			team: createDeferredCoreTeam("player-1", "seed-casual"),
			wins: 1,
			losses: 0,
			action_log: [],
		});

		await enableMultiplayer("crystal_core", "ranked");
		primeDeferredSession({
			id: "sess-ranked",
			player_id: "player-1",
			session_type: "multiplayer_ranked",
			phase: "shop",
			round: 3,
			step: 1,
			seed: "seed-ranked",
			initial_seed: "seed-ranked",
			current_options: { options: [{ id: "card_b" }] },
			team: createDeferredCoreTeam("player-1", "seed-ranked"),
			wins: 2,
			losses: 0,
			action_log: [],
		});

		const hasCasualSession = await checkActiveSessionByType("casual");
		const hasRankedSession = await checkActiveSessionByType("ranked");

		expect(hasCasualSession).toBe(true);
		expect(hasRankedSession).toBe(true);
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

	it("upgrades an anonymous account into an email account", async () => {
		(supabase.auth.getSession as jest.Mock).mockResolvedValue({
			data: {
				session: {
					user: {
						id: "guest-user-id",
						is_anonymous: true,
						user_metadata: {},
					},
				},
			},
			error: null,
		});
		(supabase.auth.updateUser as jest.Mock)
			.mockResolvedValueOnce({
				data: {
					user: {
						id: "guest-user-id",
					},
				},
				error: null,
			})
			.mockResolvedValueOnce({
				data: {
					user: {
						id: "guest-user-id",
						user_metadata: { username: "UpgradedGuest" },
					},
				},
				error: null,
			});

		const singleMock = jest.fn().mockResolvedValue({
			data: {
				id: "guest-user-id",
				username: "UpgradedGuest",
				rating: 1000,
				matches_played: 0,
			},
			error: null,
		});
		(supabase.from as jest.Mock).mockReturnValue({
			upsert: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
			single: singleMock,
		});

		const result = await handleGuestAccountUpgrade("guest@example.com", "password123", "UpgradedGuest");

		expect(supabase.auth.updateUser).toHaveBeenNthCalledWith(1, {
			email: "guest@example.com",
			password: "password123",
		});
		expect(supabase.auth.updateUser).toHaveBeenNthCalledWith(2, {
			data: { username: "UpgradedGuest" },
		});
		expect(supabase.from).toHaveBeenCalledWith("players");
		expect(result).toEqual({
			id: "guest-user-id",
			username: "UpgradedGuest",
			rating: 1000,
			matches_played: 0,
		});
	});

	it("updates a registered account username", async () => {
		(supabase.auth.getSession as jest.Mock).mockResolvedValue({
			data: {
				session: {
					user: {
						id: "registered-user-id",
						is_anonymous: false,
						user_metadata: { username: "OriginalUser" },
						email: "original@example.com",
					},
				},
			},
			error: null,
		});
		(supabase.auth.updateUser as jest.Mock).mockResolvedValue({
			data: {
				user: {
					id: "registered-user-id",
				},
			},
			error: null,
		});

		const maybeSingleMock = jest.fn().mockResolvedValue({
			data: {
				id: "registered-user-id",
				username: "OriginalUser",
				rating: 1337,
				matches_played: 10,
			},
			error: null,
		});
		(supabase.from as jest.Mock).mockReturnValue({
			upsert: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			maybeSingle: maybeSingleMock,
			single: maybeSingleMock,
		});

		const result = await handleRegisteredAccountUpdate("RenamedUser");

		expect(supabase.auth.updateUser).toHaveBeenCalledWith({
			data: { username: "RenamedUser" },
		});
		expect(result).toEqual({
			id: "registered-user-id",
			username: "RenamedUser",
			rating: 1337,
			matches_played: 10,
		});
	});
});
