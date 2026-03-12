/**
 * Core Game Logic Module
 *
 * This module contains pure TypeScript game logic with zero Phaser dependencies.
 * All game rules, session management, and phase transitions are defined here.
 *
 * Can be used in:
 * - Browser (single-player via LocalServerAdapter)
 * - Server (multiplayer via MultiplayerServerManager)
 * - Edge Functions (Supabase)
 * - Unit tests (Node.js)
 */

// Types
export * from "@Core/Types";

// Core Logic
export * from "@Core/GameLogic";
export { SessionManager } from "@Core/SessionManager";
export { PhaseTransitions } from "@Core/PhaseTransitions";

// Server Interface & Implementations
export type { IGameServer } from "@Core/IGameServer";
export { LocalServerAdapter } from "@Core/LocalServerAdapter";
export { RemoteServerAdapter } from "@Core/RemoteServerAdapter";
export { ServerFactory, getServerAdapter } from "@Core/ServerFactory";
