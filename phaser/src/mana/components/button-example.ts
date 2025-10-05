/**
 * Example: Using the Mana Button Component
 * 
 * This example demonstrates how to use the button component
 * with the Mana reactive system.
 */

import { createComponentState, setData } from '../index';
import { createButton, createButtonGroup, destroyButton } from './manabutton';

// Define your message types
type GameMsg =
	| { type: 'BUTTON_CLICKED'; buttonId: string }
	| { type: 'START_GAME' }
	| { type: 'OPEN_SETTINGS' }
	| { type: 'QUIT_GAME' };

/**
 * Example setup function for a menu scene
 */
export const setupButtonExample = (scene: Phaser.Scene) => {
	// Initialize Mana state
	const state = createComponentState<GameMsg>(scene);

	// Create a single custom styled button
	const customButton = createButton<GameMsg>({
		id: 'custom-btn',
		x: 400,
		y: 100,
		width: 250,
		height: 60,
		text: 'Custom Button',
		normalColor: 0x3b82f6, // Blue
		hoverColor: 0x2563eb, // Darker blue
		cornerRadius: 12,
		textStyle: {
			fontSize: '20px',
			fontFamily: 'Arial',
			color: '#ffffff',
			fontStyle: 'bold',
		},
		onClick: () => [{ type: 'BUTTON_CLICKED', buttonId: 'custom' }],
	});

	// Create a button group for menu
	const menuButtons = createButtonGroup<GameMsg>(
		[
			{
				id: 'start-btn',
				x: 400,
				y: 200,
				text: 'Start Game',
				onClick: () => [{ type: 'START_GAME' }],
			},
			{
				id: 'settings-btn',
				x: 400,
				y: 270,
				text: 'Settings',
				onClick: () => [{ type: 'OPEN_SETTINGS' }],
			},
			{
				id: 'quit-btn',
				x: 400,
				y: 340,
				text: 'Quit',
				onClick: () => [{ type: 'QUIT_GAME' }],
			},
		],
		{
			width: 200,
			height: 50,
			normalColor: 0x1f2937,
			hoverColor: 0x111827,
			cornerRadius: 8,
			textStyle: {
				fontSize: '18px',
				color: '#ffffff',
			},
		}
	);

	// Add title
	const titleText = {
		id: 'title',
		type: 'text' as const,
		x: 400,
		y: 50,
		text: 'Mana Button Example',
		style: {
			fontSize: '32px',
			fontFamily: 'Arial',
			color: '#ffffff',
			fontStyle: 'bold',
		},
	};

	// Combine all components
	const allComponents = [titleText, ...customButton, ...menuButtons];

	// Set the data
	setData(allComponents)(state);

	// Clean up on scene shutdown
	scene.events.on('shutdown', () => {
		destroyButton('custom-btn');
		destroyButton('start-btn');
		destroyButton('settings-btn');
		destroyButton('quit-btn');
	});

	return state;
};

/**
 * Example with dynamic button updates
 */
export const setupDynamicButtonExample = (scene: Phaser.Scene) => {
	let clickCount = 0;

	const updateFn = (msg: GameMsg, state: any) => {
		switch (msg.type) {
			case 'BUTTON_CLICKED':
				clickCount++;
				updateComponents();
				break;
		}
		return state;
	};

	const state = createComponentState(scene, updateFn);

	const updateComponents = () => {
		const button = createButton<GameMsg>({
			id: 'dynamic-btn',
			x: 400,
			y: 300,
			width: 250,
			height: 60,
			text: `Clicked ${clickCount} times`,
			normalColor: clickCount > 5 ? 0x10b981 : 0x3b82f6,
			hoverColor: clickCount > 5 ? 0x059669 : 0x2563eb,
			onClick: () => [{ type: 'BUTTON_CLICKED', buttonId: 'dynamic' }],
		});

		setData(button)(state);
	};

	updateComponents();

	return state;
};

/**
 * Example Phaser Scene using button component
 */
export class ButtonExampleScene extends Phaser.Scene {
	constructor() {
		super({ key: 'ButtonExample' });
	}

	create() {
		// Set background color
		this.cameras.main.setBackgroundColor('#1a202c');

		// Setup buttons
		setupButtonExample(this);

		// Add instructions
		this.add.text(
			400,
			550,
			'Hover over buttons to see color animation\nClick buttons to trigger messages',
			{
				fontSize: '14px',
				color: '#9ca3af',
				align: 'center',
			}
		).setOrigin(0.5);
	}
}
