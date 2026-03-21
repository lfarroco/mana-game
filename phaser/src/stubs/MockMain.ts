// Stub for edge-function bundling.
// main.ts is browser/Phaser-only and must never run in Deno.
// AudioManager (and anything else that does `import { game } from "@main"`)
// will get null here; all audio guards (`if (!game)`) handle this safely.
export const game = null;
