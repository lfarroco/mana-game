/**/**

 * Example: Using the Mana Button Component * Example: Using the Mana Button Component

	*  * 

 * This example demonstrates how to use the button component * This example demonstrates how to use the button component

	* with the Mana reactive system using the new simplified API. * with the Mana reactive system using the new simplified API.

 * / */



import { createComponent, type ManaMsg, handleManaMsg } from '../index'; import { createComponent, type ManaMsg, handleManaMsg } from '../index';

import { createButton, createButtonGroup, destroyButton } from './manabutton'; import { createButton, createButtonGroup, destroyButton } from './manabutton';



// Define your custom message types// Define your custom message types

type CustomGameMsg = type CustomGameMsg =

	| { type: 'BUTTON_CLICKED'; buttonId: string } | { type: 'BUTTON_CLICKED'; buttonId: string }

	| { type: 'START_GAME' } | { type: 'START_GAME' }

	| { type: 'OPEN_SETTINGS' } | { type: 'OPEN_SETTINGS' }

	| { type: 'QUIT_GAME' };	| { type: 'QUIT_GAME' };



// Union with ManaMsg for button compatibility// Union with ManaMsg for button compatibility

type GameMsg = CustomGameMsg | ManaMsg; type GameMsg = CustomGameMsg | ManaMsg;



/**/**

 * Example setup function for a menu scene * Example setup function for a menu scene

	* / */

export const setupButtonExample = (scene: Phaser.Scene) => {
		export const setupButtonExample = (scene: Phaser.Scene) => {

			// Initialize Mana with the new simplified API	// Initialize Mana with the new simplified API

			// Just pass scene and your update handler - single import!	// Just pass scene and your update handler - single import!

			const render = createComponent<GameMsg>(scene, (msg, state) => {
				const render = createComponent<GameMsg>(scene, (msg, state) => {

					console.log('Message received:', msg); console.log('Message received:', msg);



					// Handle ManaMsg actions first (tweens, redraws, etc.)		// Handle ManaMsg actions first (tweens, redraws, etc.)

					// This processes button hover animations and other built-in actions		// This processes button hover animations and other built-in actions

					const newState = handleManaMsg(msg, state); handleManaMsg(scene, msg, state);



					// Handle your custom messages here		// Handle your custom messages here

					// (ManaMsg actions are already handled above, so only custom msgs will reach this)		// (ManaMsg actions are already handled above, so only custom msgs will reach this)



					return newState; return state;

				});
			});



			// Create a single custom styled button	// Create a single custom styled button

			const customButton = createButton<GameMsg>({
				const customButton = createButton<GameMsg>({

					id: 'custom-btn', id: 'custom-btn',

					x: 400, x: 400,

					y: 100, y: 100,

					width: 250, width: 250,

					height: 60, height: 60,

					text: 'Custom Button', text: 'Custom Button',

					normalColor: 0x3b82f6, // Blue		normalColor: 0x3b82f6, // Blue

					hoverColor: 0x2563eb, // Darker blue		hoverColor: 0x2563eb, // Darker blue

					cornerRadius: 12, cornerRadius: 12,

					textStyle: {
						textStyle: {

							fontSize: '20px', fontSize: '20px',

							fontFamily: 'Arial', fontFamily: 'Arial',

							color: '#ffffff', color: '#ffffff',

							fontStyle: 'bold', fontStyle: 'bold',

						},
					},

					onClick: () => [{ type: 'BUTTON_CLICKED', buttonId: 'custom' }], onClick: () => [{ type: 'BUTTON_CLICKED', buttonId: 'custom' }],

				});
			});



			// Create a button group for menu	// Create a button group for menu

			const menuButtons = createButtonGroup<GameMsg>(	const menuButtons = createButtonGroup<GameMsg>(

				[[

					{			{

						id: 'start-btn', id: 'start-btn',

						x: 400, x: 400,

						y: 200, y: 200,

						text: 'Start Game', text: 'Start Game',

						onClick: () => [{ type: 'START_GAME' }], onClick: () => [{ type: 'START_GAME' }],

					},			},

			{			{

				id: 'settings-btn', id: 'settings-btn',

				x: 400, x: 400,

				y: 270, y: 270,

				text: 'Settings', text: 'Settings',

				onClick: () => [{ type: 'OPEN_SETTINGS' }], onClick: () => [{ type: 'OPEN_SETTINGS' }],

			},			},

{
	{

		id: 'quit-btn', id: 'quit-btn',

			x: 400, x: 400,

				y: 340, y: 340,

					text: 'Quit', text: 'Quit',

						onClick: () => [{ type: 'QUIT_GAME' }], onClick: () => [{ type: 'QUIT_GAME' }],

			},
},

		],		],

{
	{

		width: 200, width: 200,

			height: 50, height: 50,

				normalColor: 0x1f2937, normalColor: 0x1f2937,

					hoverColor: 0x111827, hoverColor: 0x111827,

						cornerRadius: 8, cornerRadius: 8,

							textStyle: {
								textStyle: {

									fontSize: '18px', fontSize: '18px',

										color: '#ffffff', color: '#ffffff',

			},
		},

	}
}

	);	);



// Add title	// Add title

const titleText = {
	const titleText = {

		id: 'title', id: 'title',

		type: 'text' as const, type: 'text' as const,

		x: 400, x: 400,

		y: 50, y: 50,

		text: 'Mana Button Example', text: 'Mana Button Example',

		style: {
			style: {

				fontSize: '32px', fontSize: '32px',

				fontFamily: 'Arial', fontFamily: 'Arial',

				color: '#ffffff', color: '#ffffff',

				fontStyle: 'bold', fontStyle: 'bold',

			},
		},

	};
};



// Combine all components and render	// Combine all components and render

const allComponents = [titleText, ...customButton, ...menuButtons]; const allComponents = [titleText, ...customButton, ...menuButtons];

render(allComponents); render(allComponents);



// Clean up on scene shutdown	// Clean up on scene shutdown

scene.events.on('shutdown', () => {
	scene.events.on('shutdown', () => {

		destroyButton('custom-btn'); destroyButton('custom-btn');

		destroyButton('start-btn'); destroyButton('start-btn');

		destroyButton('settings-btn'); destroyButton('settings-btn');

		destroyButton('quit-btn'); destroyButton('quit-btn');

	});
});

};};



/**/**

 * Example with dynamic button updates * Example with dynamic button updates

	* / */

export const setupDynamicButtonExample = (scene: Phaser.Scene) => {
	export const setupDynamicButtonExample = (scene: Phaser.Scene) => {

		let clickCount = 0; let clickCount = 0;



		// Initialize with the new simplified API	// Initialize with the new simplified API

		const render = createComponent<GameMsg>(scene, (msg, state) => {
			const render = createComponent<GameMsg>(scene, (msg, state) => {

				// Handle ManaMsg actions first (tweens, redraws, etc.)		// Handle ManaMsg actions first (tweens, redraws, etc.)

				let newState = handleManaMsg(msg, state); handleManaMsg(scene, msg, state);



				// Handle custom messages using type guard		// Handle custom messages

				if ('type' in msg) {
					if ('type' in msg) {

						switch (msg.type) {			switch (msg.type) {

							case 'BUTTON_CLICKED': case 'BUTTON_CLICKED':

								clickCount++; clickCount++;

								updateComponents(); updateComponents();

								break; break;

						}
					}

				}
			}

				

		return newState; return state;

		});
	});



	const updateComponents = () => {
		const updateComponents = () => {

			const button = createButton<GameMsg>({
				const button = createButton<GameMsg>({

					id: 'dynamic-btn', id: 'dynamic-btn',

					x: 400, x: 400,

					y: 300, y: 300,

					width: 250, width: 250,

					height: 60, height: 60,

					text: `Clicked ${clickCount} times`, text: \`Clicked \${clickCount} times\`,

			normalColor: clickCount > 5 ? 0x10b981 : 0x3b82f6,			normalColor: clickCount > 5 ? 0x10b981 : 0x3b82f6,

			hoverColor: clickCount > 5 ? 0x059669 : 0x2563eb,			hoverColor: clickCount > 5 ? 0x059669 : 0x2563eb,

			onClick: () => [{ type: 'BUTTON_CLICKED', buttonId: 'dynamic' }],			onClick: () => [{ type: 'BUTTON_CLICKED', buttonId: 'dynamic' }],

		});		});



		render(button);		render(button);

	};	};



	updateComponents();	updateComponents();

};};



/**/**

 * Example Phaser Scene using button component * Example Phaser Scene using button component

 */ */

export class ButtonExampleScene extends Phaser.Scene {export class ButtonExampleScene extends Phaser.Scene {

	constructor() {	constructor() {

		super({ key: 'ButtonExample' });		super({ key: 'ButtonExample' });

	}	}



	create() {	create() {

		// Set background color		// Set background color

		this.cameras.main.setBackgroundColor('#1a202c');		this.cameras.main.setBackgroundColor('#1a202c');



		// Setup buttons		// Setup buttons

		setupButtonExample(this);		setupButtonExample(this);



		// Add instructions		// Add instructions

		this.add.text(		this.add.text(

			400,			400,

			550,			550,

			'Hover over buttons to see color animation\nClick buttons to trigger messages',			'Hover over buttons to see color animation\nClick buttons to trigger messages',

			{			{

				fontSize: '14px',				fontSize: '14px',

				color: '#9ca3af',				color: '#9ca3af',

				align: 'center',				align: 'center',

			}			}

		).setOrigin(0.5);		).setOrigin(0.5);

	}	}

}}

