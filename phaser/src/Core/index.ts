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
export * from './Types';

// Core Logic
export * from './GameLogic';
export { SessionManager } from './SessionManager';
export { PhaseTransitions } from './PhaseTransitions';

// Server Interface & Implementations
export type { IGameServer } from './IGameServer';
export { LocalServerAdapter } from './LocalServerAdapter';
export { RemoteServerAdapter } from './RemoteServerAdapter';
export { ServerFactory, getServerAdapter } from './ServerFactory';
