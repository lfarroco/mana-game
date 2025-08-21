// Global type declarations for e2e tests
/// <reference types="@playwright/test" />

import * as DebugController from '../src/Scenes/Debug/DebugController';

declare global {
	interface Window {
		debugController: typeof DebugController;
	}
}

export { };
