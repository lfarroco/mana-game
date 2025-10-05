/**
 * Example: Creating a fancy button with multiple shapes
 * 
 * This demonstrates the new shape-based graphics system
 * that allows composing multiple shapes declaratively
 */

import type { GraphicsElement } from '../types';

type ButtonMsg = { type: 'BUTTON_CLICKED'; id: string };

/**
 * Create a fancy button with multiple layered shapes
 * Demonstrates: rounded rectangle base, inner highlight, border lines
 */
export const createFancyButton = (
	id: string,
	x: number,
	y: number,
	width: number,
	height: number,
	text: string,
	onClick: () => ButtonMsg[]
) => {
	const cornerRadius = 10;

	// Button with multiple composed shapes
	const button: GraphicsElement<ButtonMsg> = {
		id: `${id}-bg`,
		type: 'graphics',
		x: 0,
		y: 0,
		interactive: true,
		shapes: [
			// Base background - dark fill
			{
				type: 'roundedRectangle',
				x: -width / 2,
				y: -height / 2,
				width,
				height,
				radius: cornerRadius,
				fillColor: 0x2d3748,
				fillAlpha: 1,
			},
			// Inner highlight - lighter color with transparency
			{
				type: 'roundedRectangle',
				x: -width / 2 + 4,
				y: -height / 2 + 4,
				width: width - 8,
				height: height - 8,
				radius: cornerRadius - 2,
				fillColor: 0x4a5568,
				fillAlpha: 0.3,
			},
			// Top border highlight line
			{
				type: 'line',
				x1: -width / 2 + cornerRadius,
				y1: -height / 2 + 2,
				x2: width / 2 - cornerRadius,
				y2: -height / 2 + 2,
				strokeColor: 0x718096,
				strokeWidth: 2,
				strokeAlpha: 0.5,
			},
			// Outer border
			{
				type: 'roundedRectangle',
				x: -width / 2,
				y: -height / 2,
				width,
				height,
				radius: cornerRadius,
				strokeColor: 0x1a202c,
				strokeWidth: 2,
				strokeAlpha: 1,
			},
		],
		hitArea: {
			shape: new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
			callback: Phaser.Geom.Rectangle.Contains,
		},
		onClick,
	};

	return [
		{
			id,
			type: 'container' as const,
			x,
			y,
			children: [
				button,
				{
					id: `${id}-text`,
					type: 'text' as const,
					x: 0,
					y: 0,
					text,
					style: {
						fontSize: '18px',
						fontFamily: 'Arial',
						color: '#ffffff',
						align: 'center',
					},
				},
			],
		},
	];
};

/**
 * Create a circular icon button with decorative elements
 */
export const createCircleButton = (
	id: string,
	x: number,
	y: number,
	radius: number,
	onClick: () => ButtonMsg[]
) => {
	const button: GraphicsElement<ButtonMsg> = {
		id: `${id}-circle`,
		type: 'graphics',
		x: 0,
		y: 0,
		interactive: true,
		shapes: [
			// Outer glow circle
			{
				type: 'circle',
				x: 0,
				y: 0,
				radius: radius + 4,
				fillColor: 0x3b82f6,
				fillAlpha: 0.2,
			},
			// Main button circle
			{
				type: 'circle',
				x: 0,
				y: 0,
				radius,
				fillColor: 0x2563eb,
				fillAlpha: 1,
			},
			// Inner highlight circle
			{
				type: 'circle',
				x: -2,
				y: -2,
				radius: radius * 0.7,
				fillColor: 0x60a5fa,
				fillAlpha: 0.3,
			},
			// Border
			{
				type: 'circle',
				x: 0,
				y: 0,
				radius,
				strokeColor: 0x1e40af,
				strokeWidth: 2,
			},
		],
		hitArea: {
			shape: new Phaser.Geom.Circle(0, 0, radius),
			callback: Phaser.Geom.Circle.Contains,
		},
		onClick,
	};

	return [
		{
			id,
			type: 'container' as const,
			x,
			y,
			children: [button],
		},
	];
};

/**
 * Create a progress button that shows completion with an arc
 */
export const createProgressButton = (
	id: string,
	x: number,
	y: number,
	radius: number,
	progress: number, // 0 to 1
	onClick: () => ButtonMsg[]
) => {
	const button: GraphicsElement<ButtonMsg> = {
		id: `${id}-progress`,
		type: 'graphics',
		x: 0,
		y: 0,
		interactive: true,
		shapes: [
			// Background circle
			{
				type: 'circle',
				x: 0,
				y: 0,
				radius,
				fillColor: 0x374151,
				fillAlpha: 1,
			},
			// Progress arc (if progress > 0)
			...(progress > 0 ? [{
				type: 'arc' as const,
				x: 0,
				y: 0,
				radius: radius - 4,
				startAngle: -Math.PI / 2, // Start at top
				endAngle: -Math.PI / 2 + (2 * Math.PI * progress),
				fillColor: 0x10b981,
				fillAlpha: 0.8,
			}] : []),
			// Inner circle (button face)
			{
				type: 'circle',
				x: 0,
				y: 0,
				radius: radius - 8,
				fillColor: 0x1f2937,
				fillAlpha: 1,
			},
		],
		hitArea: {
			shape: new Phaser.Geom.Circle(0, 0, radius),
			callback: Phaser.Geom.Circle.Contains,
		},
		onClick,
	};

	return [
		{
			id,
			type: 'container' as const,
			x,
			y,
			children: [button],
		},
	];
};

/**
 * Create a triangular play button
 */
export const createPlayButton = (
	id: string,
	x: number,
	y: number,
	size: number,
	onClick: () => ButtonMsg[]
) => {
	const button: GraphicsElement<ButtonMsg> = {
		id: `${id}-play`,
		type: 'graphics',
		x: 0,
		y: 0,
		interactive: true,
		shapes: [
			// Background circle
			{
				type: 'circle',
				x: 0,
				y: 0,
				radius: size,
				fillColor: 0x10b981,
				fillAlpha: 1,
			},
			// Play triangle
			{
				type: 'triangle',
				x1: -size / 3,
				y1: -size / 2,
				x2: -size / 3,
				y2: size / 2,
				x3: size / 2,
				y3: 0,
				fillColor: 0xffffff,
				fillAlpha: 1,
			},
		],
		hitArea: {
			shape: new Phaser.Geom.Circle(0, 0, size),
			callback: Phaser.Geom.Circle.Contains,
		},
		onClick,
	};

	return [
		{
			id,
			type: 'container' as const,
			x,
			y,
			children: [button],
		},
	];
};

/**
 * Create a decorative frame using multiple shapes
 */
export const createDecorativeFrame = (
	id: string,
	x: number,
	y: number,
	width: number,
	height: number
) => {
	const frame: GraphicsElement<any> = {
		id: `${id}-frame`,
		type: 'graphics',
		x: 0,
		y: 0,
		shapes: [
			// Outer border
			{
				type: 'rectangle',
				x: -width / 2,
				y: -height / 2,
				width,
				height,
				strokeColor: 0xfbbf24,
				strokeWidth: 3,
			},
			// Inner border
			{
				type: 'rectangle',
				x: -width / 2 + 6,
				y: -height / 2 + 6,
				width: width - 12,
				height: height - 12,
				strokeColor: 0xfbbf24,
				strokeWidth: 1,
			},
			// Corner decorations (small circles)
			{
				type: 'circle',
				x: -width / 2,
				y: -height / 2,
				radius: 4,
				fillColor: 0xfbbf24,
			},
			{
				type: 'circle',
				x: width / 2,
				y: -height / 2,
				radius: 4,
				fillColor: 0xfbbf24,
			},
			{
				type: 'circle',
				x: -width / 2,
				y: height / 2,
				radius: 4,
				fillColor: 0xfbbf24,
			},
			{
				type: 'circle',
				x: width / 2,
				y: height / 2,
				radius: 4,
				fillColor: 0xfbbf24,
			},
		],
	};

	return [
		{
			id,
			type: 'container' as const,
			x,
			y,
			children: [frame],
		},
	];
};
