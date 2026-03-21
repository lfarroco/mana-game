import type { RunManifest } from "@Core/Types";

/**
 * Whether the deferred end-of-run submission feature is enabled on the client.
 * Deferred submission is enabled by default.
 */
export function isEnabled(): boolean {
	return true;
}

export type SubmitResult =
	| { submitted: true; accepted: boolean; idempotent?: boolean }
	| { submitted: false; reason: string };

/**
 * Submit a completed `RunManifest` to the `replay-commit` Supabase Edge Function.
 *
 * Returns a `SubmitResult` — always resolves (never throws), so the caller
 * can decide whether to retry or silently ignore failures.
 *
 * @param manifest  The completed RunManifest built from RunActionQueue.build()
 * @param authToken The player's Bearer JWT
 */
export async function submitRunManifest(
	manifest: RunManifest,
	authToken: string
): Promise<SubmitResult> {
	const supabaseUrl = typeof process !== "undefined" ? (process.env.SUPABASE_URL ?? "") : "";
	const endpoint = `${supabaseUrl}/functions/v1/replay-commit`;

	try {
		const response = await fetch(endpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${authToken}`,
			},
			body: JSON.stringify(manifest),
		});

		const data = await response.json();

		if (!response.ok) {
			const errorMsg = typeof data?.error === "string" ? data.error : `HTTP ${response.status}`;
			return { submitted: false, reason: errorMsg };
		}

		return {
			submitted: true,
			accepted: Boolean(data.accepted),
			...(data.idempotent ? { idempotent: true } : {}),
		};
	} catch (err: unknown) {
		const reason = err instanceof Error ? err.message : String(err);
		return { submitted: false, reason };
	}
}
