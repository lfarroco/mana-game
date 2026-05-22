// Global type declarations for testing and development

import * as DebugController from "Client/Scenes/Debug/DebugController";

declare global {
	interface Window {
		debugController: typeof DebugController;
	}
}

export { };
