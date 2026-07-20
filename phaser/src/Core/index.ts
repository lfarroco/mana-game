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

// long term goal: extract this outside the phaserjs project
// to force separation

// Types
export * from "@game/Models";

// Server Interface & Implementations
export type { GameServer } from "@Core/GameServer";
export * as  LocalServer from "@Core/LocalServer";
export * as  RemoteServer from "@Core/RemoteServer";
