import * as manabutton from './manabutton';

describe('ManaButton Component', () => {
	describe('createDeclarativeButton', () => {
		const baseConfig = {
			id: 'test-button',
			x: 100,
			y: 100,
			width: 200,
			height: 50,
			text: 'Click Me',
			states: {
				normal: { fillColor: 0x4a5568 },
			},
			onClick: () => [{ type: 'BUTTON_CLICKED' as const }],
		};

		it('should create a button with correct element structure', () => {
			const elements = manabutton.create(baseConfig);

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
						interactive: true,
						hitArea: expect.any(Object), // Phaser.Geom.Rectangle
						onClick: baseConfig.onClick,
					},
					expect.objectContaining({
						id: 'test-button-shader',
						type: 'shader',
						x: 0,
						y: 0,
						width: 200,
						height: 50,
						vertexShader: expect.any(String),
						fragmentShader: expect.any(String),
						uniforms: {
							time: 0,
							resolution: [200, 50],
							intensity: 0.45,
						},
					}),
					{
						id: 'test-button-text',
						type: 'text',
						x: 0,
						y: 0,
						origin: { x: 0.5, y: 0.5 },
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
				states: {
					normal: { fillColor: 0x00ff00 },
				},
				cornerRadius: 12,
			};

			const elements = manabutton.create(customConfig);
			const container = elements[0] as any;

			const background = container.children[0];
			const text = container.children[2];

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

				const elements = manabutton.create(config);
				const container = elements[0] as any;
				const background = container.children[0];

				const messages = background.onClick();
				expect(messages).toEqual([
					{ type: 'BUTTON_CLICKED', payload: 'test' },
					{ type: 'ANALYTICS_EVENT', event: 'button_click' },
				]);
			});
		});

	});


});