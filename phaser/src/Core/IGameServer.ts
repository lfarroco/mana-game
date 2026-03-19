import { SessionData, PhaseOptions, ActionPayload } from "@Core/Types";

/**
 * Interface for game server implementations.
 * Both LocalServerAdapter and RemoteServerAdapter implement this interface.
 */
export interface IGameServer {
	/**
	 * Create a new game session for a player.
	 * @param playerId - The player's unique identifier
	 * @param crystalId - The starting crystal/hero selection
	 * @returns The newly created session data
	 */
	createSession(playerId: string, crystalId: string): Promise<SessionData>;

	/**
	 * Get the current session for a player.
	 * @param playerId - The player's unique identifier
	 * @returns The session data or null if not found
	 */
	getSession(playerId: string): Promise<SessionData | null>;

	/**
	 * Get the available options for the current phase.
	 * @param playerId - The player's unique identifier
	 * @returns Phase options including available actions
	 */
	getPhaseOptions(playerId: string): Promise<PhaseOptions>;

	/**
	 * Handle a player action (e.g., selecting an encounter, buying a unit).
	 * @param playerId - The player's unique identifier
	 * @param actionId - The action identifier
	 * @param payload - Optional additional data for the action
	 * @returns Success status
	 */
	handleAction(playerId: string, actionId: string, payload?: ActionPayload): Promise<boolean>;
}
