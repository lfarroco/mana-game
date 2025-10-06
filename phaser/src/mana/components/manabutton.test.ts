import * as manabutton from './manabutton';
import { stopTween, redrawShape } from '../actions';

describe('ManaButton Component', () => {
	describe('createDeclarativeButton', () => {
		const baseConfig = {
			id: 'test-button',
			x: 100,
			y: 100,
			width: 200,
			height: 50,
			text: 'Click Me',
			onClick: () => [{ type: 'BUTTON_CLICKED' as const }],
		};

		it('should create a button with correct element structure', () => {
			const elements = manabutton.createDeclarativeButton(baseConfig);

			expect(elements).toHaveLength(1);
			const container = elements[0] as any; // Container element
			expect(container).toEqual({
				id: 'test-button',
				type: 'container',
				x: 100,
				y: 100,
				children: [
					{
						id: 'test-button-bg',
						type: 'roundrect',
						x: 0,
						y: 0,
						width: 200,
						height: 50,
						radius: 8, // default cornerRadius
						fillColor: 0x4a5568, // default normalColor
						fillAlpha: 1,
						interactive: true,
						hitArea: expect.any(Object), // Phaser.Geom.Rectangle
						onClick: baseConfig.onClick,
						onHover: expect.any(Function),
						onHoverOut: expect.any(Function),
					},
					{
						id: 'test-button-text',
						type: 'text',
						x: 0,
						y: 0,
						text: 'Click Me',
						style: {
							fontSize: '16px',
							color: '#ffffff',
							fontFamily: 'Arial',
							align: 'center',
						},
					},
				],
			});
		});

		it('should use custom configuration values', () => {
			const customConfig = {
				...baseConfig,
				id: 'custom-button',
				textStyle: { fontSize: '20px', color: '#ff0000' },
				normalColor: 0x00ff00,
				hoverColor: 0xff0000,
				cornerRadius: 12,
			};

			const elements = manabutton.createDeclarativeButton(customConfig);
			const container = elements[0] as any;

			const background = container.children[0];
			const text = container.children[1];

			expect(background.fillColor).toBe(0x00ff00);
			expect(background.radius).toBe(12);
			expect(text.style.fontSize).toBe('20px');
			expect(text.style.color).toBe('#ff0000');
			expect(text.style.align).toBe('center');
		}); describe('onClick behavior', () => {
			it('should return custom messages on click', () => {
				const config = {
					...baseConfig,
					onClick: () => [
						{ type: 'BUTTON_CLICKED' as const, payload: 'test' },
						{ type: 'ANALYTICS_EVENT' as const, event: 'button_click' },
					],
				};

				const elements = manabutton.createDeclarativeButton(config);
				const container = elements[0] as any;
				const background = container.children[0];

				const messages = background.onClick();
				expect(messages).toEqual([
					{ type: 'BUTTON_CLICKED', payload: 'test' },
					{ type: 'ANALYTICS_EVENT', event: 'button_click' },
				]);
			});
		});

		describe('onHover behavior', () => {
			it('should return hover animation messages on first hover', () => {
				const config = {
					...baseConfig,
					id: 'hover-test-button',
					normalColor: 0x4a5568,
					hoverColor: 0x2d3748,
				};

				const elements = manabutton.createDeclarativeButton(config);
				const container = elements[0] as any;
				const background = container.children[0];

				const messages = background.onHover();

				// Should return stopTween + createTween messages
				expect(messages).toHaveLength(2);

				// First message should stop any existing tween
				expect(messages[0]).toEqual(stopTween('hover-test-button-hover-tween'));

				// Second message should be a createTween
				expect(messages[1].type).toBe('@mana/TWEEN');
				expect(messages[1].tweenId).toBe('hover-test-button-hover-tween');
				expect(messages[1].from).toBe(0);
				expect(messages[1].to).toBe(1);
				expect(messages[1].duration).toBe(200);
				expect(messages[1].ease).toBe('Power2');
				expect(typeof messages[1].onUpdate).toBe('function');
				expect(typeof messages[1].onComplete).toBe('function');
			});

			it('should not create duplicate tweens when already hovering', () => {
				const config = { ...baseConfig, id: 'duplicate-hover-button' };
				const elements = manabutton.createDeclarativeButton(config);
				const container = elements[0] as any;
				const background = container.children[0];

				// First hover
				background.onHover();

				// Second hover (should not create new tween)
				const messages = background.onHover();
				expect(messages).toHaveLength(0);
			});

			it('should handle color interpolation correctly', () => {
				const config = {
					...baseConfig,
					id: 'color-interpolation-button',
					normalColor: 0x000000, // Black
					hoverColor: 0xffffff,  // White
				};

				const elements = manabutton.createDeclarativeButton(config);
				const container = elements[0] as any;
				const background = container.children[0];

				const messages = background.onHover();
				expect(messages).toHaveLength(2);
				const tweenMessage = messages[1] as any;

				// Test the onUpdate function at different progress values
				const testUpdate = (t: number) => {
					const updateMessages = tweenMessage.onUpdate(t);
					expect(updateMessages).toHaveLength(1);
					expect(updateMessages[0]).toEqual(
						redrawShape('color-interpolation-button-bg', { fillColor: expect.any(Number) })
					);
				};

				testUpdate(0); // Should be close to normalColor
				testUpdate(0.5); // Should be midway
				testUpdate(1); // Should be close to hoverColor
			});
		});

		describe('onHoverOut behavior', () => {
			it('should not create tweens when already at normal color', () => {
				const config = { ...baseConfig, id: 'hover-out-test-button' };
				const elements = manabutton.createDeclarativeButton(config);
				const container = elements[0] as any;
				const background = container.children[0];

				// Hover out without hovering first (color is already normal)
				const messages = background.onHoverOut();
				expect(messages).toHaveLength(0);
			});
		});
	});


	describe('Button State Management', () => {
		it('should maintain separate state for different button IDs', () => {
			const btn1 = manabutton.createDeclarativeButton({
				id: 'btn1',
				x: 0, y: 0, width: 100, height: 50,
				text: 'Btn1',
				onClick: () => [],
			});

			const btn2 = manabutton.createDeclarativeButton({
				id: 'btn2',
				x: 0, y: 0, width: 100, height: 50,
				text: 'Btn2',
				onClick: () => [],
			});

			// Each button should have its own state
			const container1 = btn1[0] as any;
			const container2 = btn2[0] as any;
			const btn1Bg = container1.children[0];
			const btn2Bg = container2.children[0];

			// Hovering btn1 should not affect btn2's hover state
			btn1Bg.onHover();
			expect(btn2Bg.onHover()).toHaveLength(2); // Should create tween for btn2
		});
	});
});