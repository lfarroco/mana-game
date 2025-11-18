import * as Phaser from "phaser";

/**
 * Converts a hex color number (e.g., 0xff00ff) to Phaser's Vector3Like format
 * used by shaders (normalized RGB values from 0.0 to 1.0)
 *
 * @param hexColor - Hex color in format 0xRRGGBB
 * @returns Vector3Like object with x=red, y=green, z=blue (0.0-1.0 range)
 *
 * @example
 * hexToVector3(0xff00ff) // Returns { x: 1.0, y: 0.0, z: 1.0 } (magenta)
 * hexToVector3(0x00ff00) // Returns { x: 0.0, y: 1.0, z: 0.0 } (green)
 * hexToVector3(0xffffff) // Returns { x: 1.0, y: 1.0, z: 1.0 } (white)
 */
export function hexToVector3(hexColor: number): Phaser.Types.Math.Vector3Like {
	// Extract RGB components using bitwise operations
	const r = (hexColor >> 16) & 0xff; // Red: shift right 16 bits, mask to 8 bits
	const g = (hexColor >> 8) & 0xff; // Green: shift right 8 bits, mask to 8 bits
	const b = hexColor & 0xff; // Blue: mask to 8 bits

	// Normalize to 0.0-1.0 range
	return {
		x: r / 255.0,
		y: g / 255.0,
		z: b / 255.0,
	};
}

/**
 * Converts Phaser's Vector3Like format back to hex color number
 *
 * @param vector3 - Vector3Like object with normalized RGB values (0.0-1.0)
 * @returns Hex color number in format 0xRRGGBB
 *
 * @example
 * vector3ToHex({ x: 1.0, y: 0.0, z: 1.0 }) // Returns 0xff00ff (magenta)
 * vector3ToHex({ x: 0.0, y: 1.0, z: 0.0 }) // Returns 0x00ff00 (green)
 */
export function vector3ToHex(vector3: Phaser.Types.Math.Vector3Like): number {
	// Clamp values to 0.0-1.0 range and convert to 0-255, with defaults for undefined
	const r = Math.round(Math.max(0, Math.min(1, vector3.x ?? 0)) * 255);
	const g = Math.round(Math.max(0, Math.min(1, vector3.y ?? 0)) * 255);
	const b = Math.round(Math.max(0, Math.min(1, vector3.z ?? 0)) * 255);

	// Combine into hex number
	return (r << 16) | (g << 8) | b;
}

/**
 * Predefined common colors in Vector3Like format for easy use with shaders
 */
export const ShaderColors = {
	// Primary colors
	RED: hexToVector3(0xff0000),
	GREEN: hexToVector3(0x00ff00),
	BLUE: hexToVector3(0x0000ff),

	// Secondary colors
	CYAN: hexToVector3(0x00ffff),
	MAGENTA: hexToVector3(0xff00ff),
	YELLOW: hexToVector3(0xffff00),

	// Grayscale
	WHITE: hexToVector3(0xffffff),
	BLACK: hexToVector3(0x000000),
	GRAY: hexToVector3(0x808080),
	LIGHT_GRAY: hexToVector3(0xcccccc),
	DARK_GRAY: hexToVector3(0x404040),

	// Magic/Fantasy colors
	PURPLE: hexToVector3(0x8a2be2),
	VIOLET: hexToVector3(0x9400d3),
	INDIGO: hexToVector3(0x4b0082),
	GOLD: hexToVector3(0xffd700),
	SILVER: hexToVector3(0xc0c0c0),
	BRONZE: hexToVector3(0xcd7f32),

	// Element colors
	FIRE: hexToVector3(0xff4500),
	ICE: hexToVector3(0x87ceeb),
	EARTH: hexToVector3(0x8b4513),
	WIND: hexToVector3(0x87ceeb),
	LIGHTNING: hexToVector3(0xffff00),
	SHADOW: hexToVector3(0x2f1b14),
	LIGHT: hexToVector3(0xfffacd),

	// UI colors
	SUCCESS: hexToVector3(0x28a745),
	WARNING: hexToVector3(0xffc107),
	DANGER: hexToVector3(0xdc3545),
	INFO: hexToVector3(0x17a2b8),
} as const;

/**
 * Creates a Vector3Like color with alpha transparency support
 * Note: This returns a Vector4Like for RGBA, but most shaders expect RGB only
 *
 * @param hexColor - Hex color in format 0xRRGGBB
 * @param alpha - Alpha value from 0.0 to 1.0
 * @returns Object with x=red, y=green, z=blue, w=alpha
 */
export function hexToVector4(
	hexColor: number,
	alpha: number = 1.0
): { x: number; y: number; z: number; w: number } {
	const rgb = hexToVector3(hexColor);
	return {
		x: rgb.x ?? 0,
		y: rgb.y ?? 0,
		z: rgb.z ?? 0,
		w: Math.max(0, Math.min(1, alpha)), // Clamp alpha to 0.0-1.0
	};
}

/**
 * Interpolates between two hex colors and returns the result as Vector3Like
 *
 * @param colorA - First hex color
 * @param colorB - Second hex color
 * @param t - Interpolation factor (0.0 = colorA, 1.0 = colorB)
 * @returns Interpolated color as Vector3Like
 */
export function lerpHexColors(
	colorA: number,
	colorB: number,
	t: number
): Phaser.Types.Math.Vector3Like {
	const vecA = hexToVector3(colorA);
	const vecB = hexToVector3(colorB);
	const clampedT = Math.max(0, Math.min(1, t));

	return {
		x: (vecA.x ?? 0) + ((vecB.x ?? 0) - (vecA.x ?? 0)) * clampedT,
		y: (vecA.y ?? 0) + ((vecB.y ?? 0) - (vecA.y ?? 0)) * clampedT,
		z: (vecA.z ?? 0) + ((vecB.z ?? 0) - (vecA.z ?? 0)) * clampedT,
	};
}
