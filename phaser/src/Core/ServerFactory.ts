import { IGameServer } from './IGameServer';
import { LocalServerAdapter } from './LocalServerAdapter';
import { RemoteServerAdapter } from './RemoteServerAdapter';

/**
 * Factory for creating the appropriate server adapter based on game mode.
 */
export class ServerFactory {
	private static instance: IGameServer | null = null;
	private static isMultiplayer: boolean = false;

	/**
	 * Get the current server adapter instance.
	 * Returns LocalServerAdapter for single-player or RemoteServerAdapter for multiplayer.
	 */
	static getServer(): IGameServer {
		if (!this.instance) {
			this.instance = this.isMultiplayer
				? new RemoteServerAdapter()
				: new LocalServerAdapter();
		}
		return this.instance;
	}

	/**
	 * Set the game mode and reinitialize the server adapter.
	 * @param multiplayer - true for multiplayer mode, false for single-player
	 */
	static setMultiplayer(multiplayer: boolean): void {
		if (this.isMultiplayer !== multiplayer) {
			this.isMultiplayer = multiplayer;
			// Recreate the adapter when mode changes
			this.instance = multiplayer
				? new RemoteServerAdapter()
				: new LocalServerAdapter();
		}
	}

	/**
	 * Check if currently in multiplayer mode.
	 */
	static isInMultiplayerMode(): boolean {
		return this.isMultiplayer;
	}

	/**
	 * Reset the server instance (useful for testing).
	 */
	static reset(): void {
		this.instance = null;
		this.isMultiplayer = false;
	}
}

/**
 * Convenience function to get the current server adapter.
 */
export function getServerAdapter(): IGameServer {
	return ServerFactory.getServer();
}
