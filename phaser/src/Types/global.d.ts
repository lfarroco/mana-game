// Global type declarations for testing and development

import * as DebugController from "Client/Screens/Debug/DebugController";

declare global {
	interface Window {
		debugController: typeof DebugController;
	}
}

export { };
