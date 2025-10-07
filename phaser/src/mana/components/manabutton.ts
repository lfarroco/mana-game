/**
 * Mana Button Component - Declarative Version
 *
 * A declarative button component that uses the new Mana features:
 * - Declarative color tweening
 * - Element state management
 * - Higher-order components
 * - Built-in state management
 *
 * This replaces the old imperative button with global state.
 */

import type { Element } from '../types';
import type { ManaMsg } from '../actions';
import { updateElementState, createTween, updateShaderUniform } from '../actions';
import { withClickable } from '../hocs';

// Fragment shader: simple purple nebula with soft glow and moving squares
const magicButtonFragShader = `
precision mediump float;

uniform float time;
uniform vec2 resolution;
uniform float intensity;
uniform vec3 squareColor;
varying vec2 fragCoord;

// Simple pseudo-random function
float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Create a rotating square
float square(vec2 p, float size, float rotation) {
	// Rotate
	float c = cos(rotation);
	float s = sin(rotation);
	mat2 rot = mat2(c, -s, s, c);
	p = rot * p;
	
	// Square distance
	vec2 d = abs(p) - size;
	return max(d.x, d.y);
}

void main(){
	// Normalized coordinates, centered
	vec2 uv = fragCoord.xy / resolution;
	vec2 p = uv - 0.5;
	p.x *= resolution.x / resolution.y;
	
	// Time variable
	float t = time * 0.5;
	
	// Create soft waves for background
	float wave1 = sin(p.x * 6.0 + t) * 0.5;
	float wave2 = sin(p.y * 5.0 - t * 0.8) * 0.5;
	
	// Combine waves for nebula effect
	float pattern = (wave1 + wave2) * 0.5 + 0.5;
	
	// Distance from center for radial fade
	float dist = length(p);
	float radialFade = 1.0 - smoothstep(0.2, 0.6, dist);
	
	// Combine pattern with radial fade
	float density = pattern * radialFade * intensity;
	
	// Add moving squares
	float squareContrib = 0.0;
	for (int i = 0; i < 5; i++) {
		float fi = float(i);
		
		// Use hash to create pseudo-random starting positions
		float offsetX = hash(vec2(fi, 1.0)) * 2.0 - 1.0;
		float offsetY = hash(vec2(fi, 2.0)) * 2.0 - 1.0;
		float speed = 0.3 + hash(vec2(fi, 3.0)) * 0.4;
		float size = 0.02 + hash(vec2(fi, 4.0)) * 0.04;
		
		// Moving position with wrapping
		vec2 pos = vec2(
			mod(offsetX + t * speed, 1.5) - 0.75,
			mod(offsetY + t * speed * 0.7, 1.2) - 0.6
		);
		
		// Rotation
		float rotation = t * (0.5 + fi * 0.3) + fi * 2.0;
		
		// Calculate square
		float sq = square(p - pos, size, rotation);
		
		// Soft edge for the square with sharper falloff for more contrast
		float squareMask = 1.0 - smoothstep(0.0, 0.015, sq);
		squareContrib += squareMask * 0.6;
	}
	
	// Combine background with squares
	density = clamp(density + squareContrib * 0.8, 0.0, 1.0);
	
	// Purple color palette with higher contrast
	vec3 purpleLight = vec3(0.7, 0.35, 1.0);  // Brighter light purple
	vec3 purpleDark = vec3(0.2, 0.05, 0.4);   // Darker purple
	
	// Mix colors based on density - much brighter where squares are
	vec3 color = mix(purpleDark, purpleLight, density);
	
	// Apply squareColor to BOTH the background AND the squares for more visible effect
	color = mix(color, squareColor, squareContrib * 0.9); // Squares get strong color
	color = mix(color, squareColor * 0.5, 0.3); // Background gets subtle color tint
	
	// Alpha based on density with higher visibility
	float alpha = clamp(density * 0.9, 0.0, 0.85);
	
	gl_FragColor = vec4(color, alpha);
}
`;

// Re-export types and helpers for convenience
export type { ManaMsg } from '../actions';
export {
	handleManaMsg,
	updateElementState,
	createColorTween,
} from '../actions';

/**
 * Button states
 */
export type ButtonState = 'normal' | 'hover' | 'pressed' | 'disabled';

/**
 * Button configuration with basic click behavior
 */
export type DeclarativeButtonConfig<Msg> = {
	readonly id: string;
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly text: string;
	readonly textStyle?: Phaser.Types.GameObjects.Text.TextStyle;
	readonly states: {
		readonly normal: { readonly fillColor: number; readonly textColor?: string };
	};
	readonly cornerRadius?: number;
	readonly onClick: () => readonly (Msg | ManaMsg)[];
};

/**
 * Create a declarative button component
 * Uses element state management and declarative color tweening
 */
export const create = <Msg>(
	config: DeclarativeButtonConfig<Msg>
): readonly Element<Msg | ManaMsg>[] => {
	const {
		id,
		x,
		y,
		width,
		height,
		text,
		textStyle = {
			fontSize: '16px',
			color: '#ffffff',
			fontFamily: 'Arial',
		},
		states,
		cornerRadius = 8,
		onClick,
	} = config;

	// Background with basic click behavior
	const baseBackground: Element<Msg | ManaMsg> = {
		id: `${id}-bg`,
		type: 'roundrect',
		x: 0,
		y: 0,
		width,
		height,
		radius: cornerRadius,
		fillColor: states.normal.fillColor,
		hitArea: {
			shape: new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
			callback: Phaser.Geom.Rectangle.Contains,
		},
	};

	const background: Element<Msg | ManaMsg> = withClickable<Msg>({
		onClick,
	})(baseBackground);

	// Text label
	const label: Element<Msg | ManaMsg> = {
		id: `${id}-text`,
		type: 'text',
		x: 0,
		y: 0,
		origin: { x: 0.5, y: 0.5 },
		text,
		style: {
			...textStyle,
			align: 'center',
		},
	};

	// Magic shader overlay (between background and text)
	// Shaders in containers should use relative coordinates (0,0)
	const baseShader: Element<Msg | ManaMsg> = {
		id: `${id}-shader`,
		type: 'shader',
		x: 0, // Relative to container
		y: 0, // Relative to container
		width,
		height,
		fragmentShader: magicButtonFragShader,
		uniforms: {
			time: 0,
			resolution: [width, height],
			intensity: 0.45, // Default intensity
			squareColor: [1.0, 0.6, 1.0], // Default: bright purple/magenta [R,G,B]
		},
		interactive: true,
	};

	console.log('[ManaButton] Creating shader with interactive hover');

	// Add hover behavior to shader - tween squareColor uniform
	const magicShader: Element<Msg | ManaMsg> = {
		...baseShader,
		onHover: (_pointer: Phaser.Input.Pointer) => {
			console.log('[ManaButton] ===== HOVER IN =====');
			return [
				createTween(
					`${id}-shader-color-hover`,
					0,
					1,
					400,
					{
						ease: 'Sine.easeInOut',
						onUpdate: (t) => {
							// Define colors fresh each time to avoid closure issues
							const from = { r: 1.0, g: 0.6, b: 1.0 }; // Purple/magenta
							const to = { r: 0.2, g: 1.0, b: 0.2 };   // Bright green

							// Inline interpolation
							const r = from.r + (to.r - from.r) * t;
							const g = from.g + (to.g - from.g) * t;
							const b = from.b + (to.b - from.b) * t;
							const color = [r, g, b];
							console.log(`[ManaButton] t=${t.toFixed(3)}, from=[${from.r},${from.g},${from.b}], to=[${to.r},${to.g},${to.b}], result=[${color.map(c => c.toFixed(3)).join(', ')}]`);
							return [
								updateShaderUniform(
									`${id}-shader`,
									'squareColor',
									color
								),
							];
						},
					}
				),
			];
		},
		onHoverOut: (_pointer: Phaser.Input.Pointer) => {
			console.log('[ManaButton] ===== HOVER OUT =====');
			return [
				createTween(
					`${id}-shader-color-unhover`,
					0,
					1,
					400,
					{
						ease: 'Sine.easeInOut',
						onUpdate: (t) => {
							// Define colors fresh each time
							const from = { r: 0.2, g: 1.0, b: 0.2 }; // Bright green
							const to = { r: 1.0, g: 0.6, b: 1.0 };   // Purple/magenta

							const r = from.r + (to.r - from.r) * t;
							const g = from.g + (to.g - from.g) * t;
							const b = from.b + (to.b - from.b) * t;
							return [
								updateShaderUniform(
									`${id}-shader`,
									'squareColor',
									[r, g, b]
								),
							];
						},
					}
				),
			];
		},
	};

	console.log(`[ManaButton] Created button with ID: ${id}, shader ID: ${id}-shader`);

	// Return as container with children
	return [
		{
			id,
			type: 'container',
			x,
			y,
			children: [background, magicShader, label],
		} as Element<Msg | ManaMsg>,
	];
};

/**
 * Update button state programmatically
 */
export const setButtonState = (
	buttonId: string,
	state: ButtonState,
	transitionDuration = 200
): ManaMsg => {
	return updateElementState(buttonId, { state, transitionDuration });
};

/**
 * Enable/disable a button
 */
export const setButtonEnabled = (
	buttonId: string,
	enabled: boolean
): ManaMsg => {
	return updateElementState(buttonId, { disabled: !enabled });
};
