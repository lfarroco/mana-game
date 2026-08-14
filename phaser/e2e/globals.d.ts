// Global type declarations for the Playwright e2e tests.

/// <reference types="@playwright/test" />

export {};

declare global {
	interface Window {
		/**
		 * Dev-only game controller installed by `DebugCommands.installDebugCommands()`
		 * (see phaser/src/debug/debugCommands.ts). Drives the real game flows and
		 * exposes read-only state probes for the e2e smoke test.
		 */
		__debug: {
			goGameOver: (opts?: unknown) => Promise<void>;
			goVictory: (opts?: unknown) => Promise<void>;

			clickSinglePlayer: () => Promise<void>;
			clickNewRun: () => Promise<void>;
			clickPlay: () => Promise<void>;
			selectOption: (index: number) => Promise<void>;
			skip: () => Promise<void>;
			replayCombat: () => Promise<void>;
			continueCombat: () => Promise<void>;

			getScreen: () => string | null;
			getScreenPhase: () => string | null;
			getPhase: () => string;
			getOptions: () => string[];
		};
	}
}

