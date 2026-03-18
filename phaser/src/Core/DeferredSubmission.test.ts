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
	it("returns false when DEFERRED_SUBMISSION env var is not set", () => {
		delete process.env.DEFERRED_SUBMISSION;
		expect(isEnabled()).toBe(false);
	});

	it("returns true when DEFERRED_SUBMISSION env var is 'true'", () => {
		process.env.DEFERRED_SUBMISSION = "true";
		expect(isEnabled()).toBe(true);
		delete process.env.DEFERRED_SUBMISSION;
	});
});

describe("submitRunManifest", () => {
	beforeEach(() => {
		mockFetch.mockReset();
		process.env.DEFERRED_SUBMISSION = "true";
		process.env.SUPABASE_URL = "https://example.supabase.co";
	});

	afterEach(() => {
		delete process.env.DEFERRED_SUBMISSION;
		delete process.env.SUPABASE_URL;
	});

	it("returns noop result when feature flag is off", async () => {
		delete process.env.DEFERRED_SUBMISSION;
		const result = await submitRunManifest(makeManifest(), "token-abc");
		expect(result.submitted).toBe(false);
		expect((result as { submitted: false; reason: string }).reason).toMatch(/disabled/i);
		expect(mockFetch).not.toHaveBeenCalled();
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
