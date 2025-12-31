import { PhaseOptions } from "./MultiplayerTypes";
import { State } from "@Models/State";

export class MultiplayerManager {
	private static instance: MultiplayerManager;
	public isMultiplayer: boolean = false;

	private constructor() { }

	public static getInstance(): MultiplayerManager {
		if (!MultiplayerManager.instance) {
			MultiplayerManager.instance = new MultiplayerManager();
		}
		return MultiplayerManager.instance;
	}

	public enableMultiplayer() {
		this.isMultiplayer = true;
		console.log("Multiplayer mode enabled");
	}

	public disableMultiplayer() {
		this.isMultiplayer = false;
		console.log("Multiplayer mode disabled");
	}

	// Requests the current phase options from the server
	public async getPhaseOptions(_state: State): Promise<PhaseOptions> {
		// TODO: Implement actual server call
		// Mock response for now
		return new Promise((resolve) => {
			console.log("Mock: Fetching phase options from server...");
			setTimeout(() => {
				// Determine phase based on state or random for mock
				// For now, let's just return a generic encounter mock to test flow
				resolve({
					phase: "encounter",
					options: [{ id: "upgrade_unit" }, { id: "armory" }, { id: "healing_tent" }]
				});
			}, 500);
		});
	}

	public async sendOptionSelection(optionId: string): Promise<boolean> {
		// TODO: Implement actual server call
		console.log(`Mock: Sending selection ${optionId} to server...`);
		return Promise.resolve(true);
	}
}
