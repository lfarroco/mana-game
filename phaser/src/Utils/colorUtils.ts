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
