// Global type declarations for testing and development

import * as DebugController from '../Scenes/Debug/DebugController';

declare global {
	interface Window {
		debugController: typeof DebugController;
	}
}

export { };
