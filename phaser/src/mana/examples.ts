/**
 * Mana Library Extension Examples
 *
 * This file demonstrates how to extend the Mana reactive rendering library
 * with custom component types, properties, update handlers, and cleanup hooks.
 *
 * These examples show the extensibility features that make Mana suitable
 * for complex game development with many different game object types.
 */

import type { BaseElement, ComponentState } from './types';
import {
	registerComponentFactory,
	registerPropertySetter,
	registerUpdateHandler,
	registerCleanupHook,
	applyBaseProps
} from './index';

// ========================================
// Example 1: Custom Component Types
// ========================================

/**
 * Sprite component with animation support
 */
type SpriteElement<Msg> = BaseElement<Msg> & {
	type: 'sprite';
	texture: string;
	frame?: string | number;
	animation?: string;
	tint?: number;
};

/**
 * Particle emitter component
 */
type ParticleElement<Msg> = BaseElement<Msg> & {
	type: 'particles';
	texture: string;
	config?: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;
};

/**
 * NineSlice component for scalable UI
 */
type NineSliceElement<Msg> = BaseElement<Msg> & {
	type: 'nineslice';
	texture: string;
	width: number;
	height: number;
	leftWidth: number;
	rightWidth: number;
	topHeight: number;
	bottomHeight: number;
};

/**
 * Animated tile sprite component
 */
type TileSpriteElement<Msg> = BaseElement<Msg> & {
	type: 'tilesprite';
	texture: string;
	width: number;
	height: number;
	tilePosition?: { x: number; y: number };
};

// ========================================
// Register Custom Component Factories
// ========================================

/**
 * Register sprite factory
 */
registerComponentFactory('sprite', (state, data) => {
	const spriteData = data as any;
	const sprite = state.scene.add.sprite(
		spriteData.x,
		spriteData.y,
		spriteData.texture,
		spriteData.frame
	);

	applyBaseProps(sprite, data, state);

	if (spriteData.animation) {
		sprite.play(spriteData.animation);
	}

	if (spriteData.tint !== undefined) {
		sprite.setTint(spriteData.tint);
	}

	return sprite;
});

/**
 * Register particle emitter factory
 */
registerComponentFactory('particles', (state, data) => {
	const particleData = data as any;
	const particles = state.scene.add.particles(
		particleData.x,
		particleData.y,
		particleData.texture,
		particleData.config
	);

	applyBaseProps(particles, data, state);
	return particles;
});

/**
 * Register NineSlice factory (Phaser 3.55+)
 */
registerComponentFactory('nineslice', (state, data) => {
	const nineSliceData = data as any;

	// Use Phaser's NineSlice if available, fallback to regular image
	const nineSlice = (state.scene.add as any).nineslice
		? (state.scene.add as any).nineslice(
			nineSliceData.x,
			nineSliceData.y,
			nineSliceData.texture,
			undefined,
			nineSliceData.width,
			nineSliceData.height,
			nineSliceData.leftWidth,
			nineSliceData.rightWidth,
			nineSliceData.topHeight,
			nineSliceData.bottomHeight
		)
		: state.scene.add.image(nineSliceData.x, nineSliceData.y, nineSliceData.texture);

	applyBaseProps(nineSlice, data, state);
	return nineSlice;
});

/**
 * Register tile sprite factory
 */
registerComponentFactory('tilesprite', (state, data) => {
	const tileData = data as any;
	const tileSprite = state.scene.add.tileSprite(
		tileData.x,
		tileData.y,
		tileData.width,
		tileData.height,
		tileData.texture
	);

	applyBaseProps(tileSprite, data, state);

	if (tileData.tilePosition) {
		tileSprite.setTilePosition(tileData.tilePosition.x, tileData.tilePosition.y);
	}

	return tileSprite;
});

// ========================================
// Example 2: Custom Properties
// ========================================

/**
 * Add tint property support for all components
 */
registerPropertySetter('tint', (obj, val) => {
	if ('setTint' in obj && typeof val === 'number') {
		obj.setTint(val);
	}
});

/**
 * Add depth property for layering
 */
registerPropertySetter('depth', (obj, val) => {
	if ('setDepth' in obj && typeof val === 'number') {
		obj.setDepth(val);
	}
});

/**
 * Add origin property for pivot points
 */
registerPropertySetter('origin', (obj, val) => {
	if ('setOrigin' in obj && val && typeof val === 'object' && 'x' in val && 'y' in val) {
		obj.setOrigin(val.x, val.y);
	}
});

/**
 * Add scroll factor for camera effects
 */
registerPropertySetter('scrollFactor', (obj, val) => {
	if ('setScrollFactor' in obj && val && typeof val === 'object' && 'x' in val && 'y' in val) {
		obj.setScrollFactor(val.x, val.y);
	}
});

/**
 * Add blend mode property
 */
registerPropertySetter('blendMode', (obj, val) => {
	if ('setBlendMode' in obj && typeof val === 'string') {
		const blendMode = Phaser.BlendModes[val as keyof typeof Phaser.BlendModes];
		if (blendMode !== undefined) {
			obj.setBlendMode(blendMode);
		}
	}
});

/**
 * Add custom shader property
 */
registerPropertySetter('shader', (obj, val) => {
	if ('setPipeline' in obj && typeof val === 'string') {
		obj.setPipeline(val);
	}
});

// ========================================
// Example 3: Custom Update Handlers
// ========================================

/**
 * Update handler for sprites
 * Handles animation changes and tint updates
 */
registerUpdateHandler('sprite', (gameObject, data, _state) => {
	const sprite = gameObject as Phaser.GameObjects.Sprite;
	const spriteData = data as any;

	// Update animation if changed
	if (spriteData.animation && sprite.anims.currentAnim?.key !== spriteData.animation) {
		sprite.play(spriteData.animation);
	}

	// Update tint if specified
	if (spriteData.tint !== undefined) {
		sprite.setTint(spriteData.tint);
	}
});

/**
 * Update handler for particles
 * Handles configuration changes
 */
registerUpdateHandler('particles', (_gameObject, _data, _state) => {
	// Note: Updating particle config might require recreating the emitter
	// This is a simplified example - in practice you'd need more complex logic
});

/**
 * Update handler for NineSlice
 * Handles size changes
 */
registerUpdateHandler('nineslice', (gameObject, data, _state) => {
	const nineSliceData = data as any;

	// Update size if available
	if ('setSize' in gameObject) {
		(gameObject as any).setSize(nineSliceData.width, nineSliceData.height);
	}
});

/**
 * Update handler for tile sprites
 * Handles tile position updates
 */
registerUpdateHandler('tilesprite', (gameObject, data, _state) => {
	const tileSprite = gameObject as Phaser.GameObjects.TileSprite;
	const tileData = data as any;

	// Update tile position for scrolling effects
	if (tileData.tilePosition) {
		tileSprite.setTilePosition(tileData.tilePosition.x, tileData.tilePosition.y);
	}
});

// ========================================
// Example 4: Custom Cleanup Hooks
// ========================================

/**
 * Cleanup hook for stopping all animations
 */
registerCleanupHook((_state: ComponentState<any>) => {
	console.log('[Mana] Stopping all animations during cleanup');

	// Note: In a real implementation, you'd iterate through state.elements
	// and stop animations. This is just a logging example.
});

/**
 * Cleanup hook for particle emitters
 */
registerCleanupHook((_state: ComponentState<any>) => {
	console.log('[Mana] Cleaning up particle emitters');

	// Note: In a real implementation, you'd iterate through state.elements
	// and stop particle emitters. This is just a logging example.
});

/**
 * Cleanup hook for custom resource tracking
 */
let customResources: string[] = [];

registerCleanupHook((_state: ComponentState<any>) => {
	console.log('[Mana] Cleaning up custom resources:', customResources);
	customResources = []; // Clear the list
});

// ========================================
// Example 5: Advanced Component Types
// ========================================

/**
 * Button component with multiple states
 */
type ButtonElement<Msg> = BaseElement<Msg> & {
	type: 'button';
	texture: string;
	hoverTexture?: string;
	pressedTexture?: string;
	disabledTexture?: string;
	text?: string;
	textStyle?: Phaser.Types.GameObjects.Text.TextStyle;
	disabled?: boolean;
};

/**
 * Progress bar component
 */
type ProgressBarElement<Msg> = BaseElement<Msg> & {
	type: 'progressbar';
	backgroundTexture: string;
	fillTexture: string;
	width: number;
	height: number;
	progress: number; // 0-1
	fillDirection?: 'horizontal' | 'vertical';
};

/**
 * Register button factory
 */
registerComponentFactory('button', (state, data) => {
	const buttonData = data as any;
	const button = state.scene.add.container(buttonData.x, buttonData.y);

	// Create background sprite
	const background = state.scene.add.sprite(0, 0, buttonData.texture);
	button.add(background);

	// Create text if specified
	let text: Phaser.GameObjects.Text | undefined;
	if (buttonData.text) {
		text = state.scene.add.text(0, 0, buttonData.text, buttonData.textStyle || {});
		text.setOrigin(0.5);
		button.add(text);
	}

	// Store references for update handler
	(button as any)._background = background;
	(button as any)._text = text;
	(button as any)._buttonData = buttonData;

	applyBaseProps(button, data, state);
	return button;
});

/**
 * Register progress bar factory
 */
registerComponentFactory('progressbar', (state, data) => {
	const progressData = data as any;
	const progressBar = state.scene.add.container(progressData.x, progressData.y);

	// Create background
	const background = state.scene.add.sprite(0, 0, progressData.backgroundTexture);
	progressBar.add(background);

	// Create fill mask
	const fill = state.scene.add.sprite(0, 0, progressData.fillTexture);
	const mask = state.scene.add.graphics();
	mask.fillStyle(0xffffff);
	mask.fillRect(-progressData.width / 2, -progressData.height / 2, progressData.width, progressData.height);
	fill.setMask(mask.createGeometryMask());

	progressBar.add(fill);
	progressBar.add(mask);

	// Store references
	(progressBar as any)._background = background;
	(progressBar as any)._fill = fill;
	(progressBar as any)._mask = mask;
	(progressBar as any)._progressData = progressData;

	applyBaseProps(progressBar, data, state);
	return progressBar;
});

// ========================================
// Update Handlers for Advanced Components
// ========================================

/**
 * Update handler for buttons
 */
registerUpdateHandler('button', (gameObject, data, _state) => {
	const button = gameObject as Phaser.GameObjects.Container;
	const buttonData = data as any;
	const background = (button as any)._background as Phaser.GameObjects.Sprite;
	const text = (button as any)._text as Phaser.GameObjects.Text;

	// Update text if changed
	if (text && buttonData.text !== text.text) {
		text.setText(buttonData.text);
	}

	// Update disabled state
	if (buttonData.disabled) {
		background.setTint(0x666666);
		button.disableInteractive();
	} else {
		background.clearTint();
		button.setInteractive();
	}
});

/**
 * Update handler for progress bars
 */
registerUpdateHandler('progressbar', (gameObject, data, _state) => {
	const progressBar = gameObject as Phaser.GameObjects.Container;
	const progressData = data as any;
	const mask = (progressBar as any)._mask as Phaser.GameObjects.Graphics;

	// Update progress
	const direction = progressData.fillDirection || 'horizontal';
	const progress = Math.max(0, Math.min(1, progressData.progress));

	// Clear and redraw mask
	mask.clear();
	mask.fillStyle(0xffffff);

	if (direction === 'horizontal') {
		mask.fillRect(
			-progressData.width / 2,
			-progressData.height / 2,
			progressData.width * progress,
			progressData.height
		);
	} else {
		mask.fillRect(
			-progressData.width / 2,
			-progressData.height / 2 + progressData.height * (1 - progress),
			progressData.width,
			progressData.height * progress
		);
	}
});

// ========================================
// Example Usage
// ========================================

/*
// In your game code:

import { createComponentState, setData } from './mana';
// Import the examples to register all extensions
import './examples';

type GameMsg =
  | { type: 'SPRITE_CLICKED', id: string }
  | { type: 'BUTTON_CLICKED', id: string }
  | { type: 'PROGRESS_UPDATE', value: number };

const state = createComponentState(scene, updateFunction);

const components = [
  // Custom sprite with animation
  {
    id: 'hero',
    type: 'sprite',
    x: 100,
    y: 100,
    texture: 'hero',
    animation: 'hero-idle',
    tint: 0xffffff,
    depth: 10,
    interactive: true,
    onClick: () => [{ type: 'SPRITE_CLICKED', id: 'hero' }]
  } as SpriteElement<GameMsg>,

  // Particle effects
  {
    id: 'magic-particles',
    type: 'particles',
    x: 200,
    y: 200,
    texture: 'particle',
    config: {
      speed: 100,
      lifespan: 2000,
      quantity: 10
    }
  } as ParticleElement<GameMsg>,

  // Scalable UI element
  {
    id: 'panel-bg',
    type: 'nineslice',
    x: 400,
    y: 300,
    texture: 'panel',
    width: 200,
    height: 100,
    leftWidth: 10,
    rightWidth: 10,
    topHeight: 10,
    bottomHeight: 10
  } as NineSliceElement<GameMsg>,

  // Scrolling background
  {
    id: 'scrolling-bg',
    type: 'tilesprite',
    x: 400,
    y: 300,
    width: 800,
    height: 600,
    texture: 'background',
    tilePosition: { x: 0, y: 0 },
    scrollFactor: { x: 0.5, y: 0.5 }
  } as TileSpriteElement<GameMsg>,

  // Interactive button
  {
    id: 'start-button',
    type: 'button',
    x: 400,
    y: 400,
    texture: 'button-normal',
    text: 'Start Game',
    interactive: true,
    onClick: () => [{ type: 'BUTTON_CLICKED', id: 'start' }]
  } as ButtonElement<GameMsg>,

  // Progress bar
  {
    id: 'health-bar',
    type: 'progressbar',
    x: 100,
    y: 50,
    backgroundTexture: 'bar-bg',
    fillTexture: 'health-fill',
    width: 200,
    height: 20,
    progress: 0.75,
    fillDirection: 'horizontal'
  } as ProgressBarElement<GameMsg>
];

setData(components)(state);
*/

// ========================================
// Type Exports for TypeScript Users
// ========================================

export type {
	SpriteElement,
	ParticleElement,
	NineSliceElement,
	TileSpriteElement,
	ButtonElement,
	ProgressBarElement
};