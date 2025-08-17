import { Vec2 } from "../Utils/Vec2";

// Forward declaration to avoid circular imports
interface Unit {
	id: string;
	position: Vec2;
	// Add other essential Unit properties as needed
}

/**
 * Common type definitions to replace `any` types throughout the codebase
 */

/**
 * Represents a tile position on the game board
 */
export interface TilePosition extends Vec2 {
	/** Additional tile-specific properties can be added here */
	isEmpty?: boolean;
	isValidDrop?: boolean;
}

/**
 * Standard error type for error handlers
 */
export type GameError = Error | string | unknown;

/**
 * Phaser scene reference type
 */
export type PhaserScene = Phaser.Scene;

/**
 * Text configuration for Phaser text objects
 */
export type TextConfig = Phaser.Types.GameObjects.Text.TextStyle;

/**
 * Generic event handler type for game events
 */
export type EventHandler<T extends unknown[] = unknown[]> = (...args: T) => void;

/**
 * Context types for event handlers
 */
export type EventContext = Record<string, unknown> | undefined;

/**
 * Parameters for skill and effect functions
 */
export interface SkillParams {
	scene: PhaserScene;
	source?: Vec2;
	target?: Vec2 | Unit;
	duration?: number;
	intensity?: number;
	amount?: number;
	[key: string]: unknown;
}

/**
 * Parameters for effect functions
 */
export interface EffectParams {
	scene: PhaserScene;
	position?: Vec2;
	target?: Unit;
	source?: Unit;
	duration?: number;
	color?: number;
	intensity?: number;
	[key: string]: unknown;
}

/**
 * Orb drop target interface
 */
export interface OrbDropTarget {
	x: number;
	y: number;
	unit?: Unit;
	tile?: TilePosition;
}

/**
 * Drag and drop related types
 */
export interface DragDropOrb {
	id: string;
	type: string;
	x: number;
	y: number;
}

/**
 * Force/Team identifier type
 */
export interface ForceIdentifier {
	id: string;
}

/**
 * Movement update result type
 */
export interface MovementResult {
	movedUnit: Unit;
	swappedUnit?: Unit;
	oldPositionOfMovedUnit: Vec2;
}

/**
 * Visual position with screen coordinates
 */
export interface VisualPosition {
	x: number;
	y: number;
}

/**
 * Callback for position updates
 */
export type PositionUpdateCallback = (unit: Unit, target: TilePosition, units: Unit[]) => MovementResult | null;

/**
 * Interactive object type for Phaser
 */
export interface InteractiveShape {
	setInteractive(shape?: unknown, callback?: unknown): unknown;
}

/**
 * Hit area callback type
 */
export type HitAreaCallback = (hitArea: unknown, x: number, y: number, gameObject: unknown) => boolean;

/**
 * Orb effect callback type
 */
export type OrbEffectCallback = (unit: Unit, scene: PhaserScene) => void;

/**
 * Orb specification interface
 */
export interface OrbSpec {
	id: string;
	name: string;
	color: number;
	tooltip: string;
	effect: OrbEffectCallback;
}

/**
 * Orb drop handler parameters
 */
export interface OrbDropParams {
	orb: DragDropOrb;
	target: OrbDropTarget;
	orbSpec: OrbSpec;
	orbName: string;
	ui: unknown; // ShopUI type would be defined elsewhere
	magicOrb: unknown; // MagicOrb type would be defined elsewhere
}
