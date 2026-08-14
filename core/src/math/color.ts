export type Vec3 = { x: number; y: number; z: number };

/**
 * Converts a hex color number (e.g., 0xff00ff) to a normalized RGB vector
 * (values from 0.0 to 1.0), structurally compatible with Phaser's Vector3Like.
 *
 * @param hexColor - Hex color in format 0xRRGGBB
 * @returns Vec3 object with x=red, y=green, z=blue (0.0-1.0 range)
 *
 * @example
 * hexToVector3(0xff00ff) // Returns { x: 1.0, y: 0.0, z: 1.0 } (magenta)
 * hexToVector3(0x00ff00) // Returns { x: 0.0, y: 1.0, z: 0.0 } (green)
 * hexToVector3(0xffffff) // Returns { x: 1.0, y: 1.0, z: 1.0 } (white)
 */
export function hexToVector3(hexColor: number): Vec3 {
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

export const mixHexColors = (
  from: number,
  to: number,
  amount: number,
): number => {
  const progress = Math.max(0, Math.min(1, amount));
  const fromR = (from >> 16) & 0xff;
  const fromG = (from >> 8) & 0xff;
  const fromB = from & 0xff;
  const toR = (to >> 16) & 0xff;
  const toG = (to >> 8) & 0xff;
  const toB = to & 0xff;

  const r = Math.round(fromR + (toR - fromR) * progress);
  const g = Math.round(fromG + (toG - fromG) * progress);
  const b = Math.round(fromB + (toB - fromB) * progress);

  return (r << 16) | (g << 8) | b;
};
