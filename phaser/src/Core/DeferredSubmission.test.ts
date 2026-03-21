/**
 * Tests for DeferredSubmission — the client-side module that submits a
 * completed RunManifest to the `replay-commit` Edge Function.
 */

import { submitRunManifest, isEnabled } from "@Core/DeferredSubmission";
import type { RunManifest } from "@Core/Types";

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const makeManifest = (): RunManifest => ({
	runId: "run-submit-001",
	playerId: "player-1",
	selectedCrystalId: "crystal_core",
	initialSeed: "seed_abc",
	clientVersion: "1.0.0",
	actions: [{ sequence: 1, actionId: "forest_pools" }],
});

describe("isEnabled", () => {
	it("returns true by default", () => {
		expect(isEnabled()).toBe(true);
	});
});

describe("submitRunManifest", () => {
	beforeEach(() => {
		mockFetch.mockReset();
		process.env.SUPABASE_URL = "https://example.supabase.co";
	});

	afterEach(() => {
		delete process.env.SUPABASE_URL;
	});

	it("POSTs the manifest to the replay-commit endpoint", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ success: true, accepted: true }),
		});

		const result = await submitRunManifest(makeManifest(), "token-abc");

		expect(mockFetch).toHaveBeenCalledTimes(1);
		const [url, options] = mockFetch.mock.calls[0];
		expect(url).toContain("replay-commit");
		expect(options.method).toBe("POST");
		const body = JSON.parse(options.body);
		expect(body.runId).toBe("run-submit-001");
		expect(result.submitted).toBe(true);
		expect((result as { submitted: true; accepted: boolean }).accepted).toBe(true);
	});

	it("returns submitted=false and the error when the server responds with an error", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: false,
			json: async () => ({ error: "Invalid manifest" }),
		});

		const result = await submitRunManifest(makeManifest(), "token-abc");
		expect(result.submitted).toBe(false);
		expect((result as { submitted: false; reason: string }).reason).toContain("Invalid manifest");
	});

	it("returns submitted=false on network failure", async () => {
		mockFetch.mockRejectedValueOnce(new Error("Network error"));

		const result = await submitRunManifest(makeManifest(), "token-abc");
		expect(result.submitted).toBe(false);
		expect((result as { submitted: false; reason: string }).reason).toContain("Network error");
	});
});
