/**
 * Game Logic — barrel file for edge function bundling.
 *
 * This file is used by esbuild (via bundle-edge.ts) as the entry point for
 * creating _shared.js bundles consumed by Supabase edge functions.
 *
 * Re-exports pure game logic from @game/* (resolved to core/src/).
 */

export { generateEnemyTeamForRound } from "@game/EnemyGeneration";
export { createInitialSession, updateTeamAction } from "@game/SessionManagement";

// TODO: implement replayManifest for replay-commit edge function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function replayManifest(_manifest: any, _options: any): { session: any; rejectReason?: string } {
	throw new Error("replayManifest not yet implemented");
}
