/**
 * Basic Interaction Example
 *
 * This example demonstrates how to create interactive components using the Mana library
 * with image, text, and container game objects in Phaser.
 */

import Phaser from 'phaser';
import { createComponentState, setData } from '../index';

// Define your message types
type GameMsg =
	| { type: 'HERO_CLICKED' }
	| { type: 'SCORE_CLICKED' }
	| { type: 'PANEL_CLICKED' };

// Define your game state
type GameState = {
	score: number;
	heroPosition: { x: number; y: number };
	panelVisible: boolean;
};

// Message handler function
const updateFunction = (msg: GameMsg, currentState: GameState): GameState => {
	switch (msg.type) {
		case 'HERO_CLICKED':
			console.log('Hero clicked! Moving hero...');
			return {
				...currentState,
				heroPosition: {
					x: currentState.heroPosition.x + 20,
					y: currentState.heroPosition.y
				}
			};

		case 'SCORE_CLICKED':
			console.log('Score clicked! Increasing score...');
			return {
				...currentState,
				score: currentState.score + 10
			};

		case 'PANEL_CLICKED':
			console.log('Panel clicked! Toggling visibility...');
			return {
				...currentState,
				panelVisible: !currentState.panelVisible
			};

		default:
			return currentState;
	}
};

/**
 * Sets up a basic interaction example within an existing Phaser scene.
 * This function can be called from any scene's create() method to add
 * interactive Mana components.
 *
 * @param scene - The Phaser scene to add the example to
 * @returns An object with the mana state and game state for further interaction
 */
export const setupBasicInteractionExample = (scene: Phaser.Scene) => {
	// Initialize game state
	const gameState: GameState = {
		score: 0,
		heroPosition: { x: 100, y: 100 },
		panelVisible: true
	};

	// Initialize Mana state with proper update function
	let manaState: any;
	const updateFunctionWrapper = (msg: GameMsg) => {
		const newGameState = updateFunction(msg, gameState);
		Object.assign(gameState, newGameState); // Update the game state
		updateComponents();
		return manaState; // Return the mana state as required
	};

	manaState = createComponentState(scene, updateFunctionWrapper);

	// Function to update components (needs to be defined after manaState)
	const updateComponents = () => {
		const components: Array<any> = [
			// Interactive hero image
			{
				id: 'hero',
				type: 'image' as const,
				x: gameState.heroPosition.x,
				y: gameState.heroPosition.y,
				texture: 'hero',
				tint: 0x00ff00, // Green tint
				interactive: true,
				onClick: () => [{ type: 'HERO_CLICKED' as const }]
			},

			// Interactive score text
			{
				id: 'score-text',
				type: 'text' as const,
				x: 400,
				y: 50,
				text: `Score: ${gameState.score}`,
				style: {
					fontSize: '24px',
					color: '#ffffff',
					backgroundColor: '#000000'
				},
				interactive: true,
				onClick: () => [{ type: 'SCORE_CLICKED' as const }]
			},

			// Interactive container panel (only if visible)
			...(gameState.panelVisible ? [{
				id: 'ui-panel',
				type: 'container' as const,
				x: 200,
				y: 300,
				interactive: true,
				onClick: () => [{ type: 'PANEL_CLICKED' as const }]
			}] : [])
		];

		setData(components)(manaState);
	};

	// Create initial components
	updateComponents();

	// Add some visual feedback
	scene.add.text(10, 10, 'Click the hero to move it,\nclick score to increase,\nclick panel to toggle', {
		fontSize: '16px',
		color: '#ffffff'
	});

	return {
		manaState,
		gameState,
		updateComponents
	};
};

// Phaser scene class that uses Mana (for standalone usage)
export class ManaExampleScene extends Phaser.Scene {
	constructor() {
		super({ key: 'ManaExample' });
	}

	preload() {
		// Load some basic assets (you would replace these with your actual assets)
		// For this example, we'll create colored rectangles as textures
		this.load.image('hero', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
		this.load.image('panel-bg', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
	}

	create() {
		// Use the reusable setup function
		setupBasicInteractionExample(this);
	}
}

// Example of how to use this scene in a Phaser game
export const createExampleGame = () => {
	return new Phaser.Game({
		type: Phaser.AUTO,
		width: 800,
		height: 600,
		backgroundColor: '#2c3e50',
		scene: ManaExampleScene,
		parent: 'game-container'
	});
};