import {
	ManaMsg,
	redrawShape,
	updateElement,
	setFillColor,
	setVisible,
	moveTo,
	createTween,
	stopTween,
	createSequence,
	createDelay,
} from './actions';

describe('Mana Actions', () => {
	describe('Helper Functions', () => {
		describe('redrawShape', () => {
			it('should create a RedrawShapeAction', () => {
				const action = redrawShape('test-element', { fillColor: 0xff0000 });

				expect(action).toEqual({
					type: '@mana/REDRAW_SHAPE',
					elementId: 'test-element',
					properties: { fillColor: 0xff0000 },
				});
				expect(action.type).toBe('@mana/REDRAW_SHAPE');
			});

			it('should handle multiple properties', () => {
				const action = redrawShape('test-element', {
					fillColor: 0xff0000,
					fillAlpha: 0.8,
					width: 100,
					height: 50,
				});

				expect(action.properties).toEqual({
					fillColor: 0xff0000,
					fillAlpha: 0.8,
					width: 100,
					height: 50,
				});
			});
		});

		describe('setFillColor', () => {
			it('should create a RedrawShapeAction with fillColor', () => {
				const action = setFillColor('button-bg', 0x4a5568);

				expect(action).toEqual({
					type: '@mana/REDRAW_SHAPE',
					elementId: 'button-bg',
					properties: { fillColor: 0x4a5568 },
				});
			});
		});

		describe('updateElement', () => {
			it('should create an UpdateElementAction', () => {
				const action = updateElement('test-element', {
					x: 100,
					y: 200,
					visible: true,
				});

				expect(action).toEqual({
					type: '@mana/UPDATE_ELEMENT',
					elementId: 'test-element',
					properties: { x: 100, y: 200, visible: true },
				});
			});
		});

		describe('setVisible', () => {
			it('should create an UpdateElementAction for visibility', () => {
				const action = setVisible('modal', false);

				expect(action).toEqual({
					type: '@mana/UPDATE_ELEMENT',
					elementId: 'modal',
					properties: { visible: false },
				});
			});
		});

		describe('moveTo', () => {
			it('should create an UpdateElementAction for position', () => {
				const action = moveTo('character', 150, 300);

				expect(action).toEqual({
					type: '@mana/UPDATE_ELEMENT',
					elementId: 'character',
					properties: { x: 150, y: 300 },
				});
			});
		});

		describe('createTween', () => {
			it('should create a TweenAction with basic options', () => {
				const action = createTween('fade-tween', 0, 1, 500);

				expect(action).toEqual({
					type: '@mana/TWEEN',
					tweenId: 'fade-tween',
					from: 0,
					to: 1,
					duration: 500,
					ease: undefined,
					onUpdate: undefined,
					onComplete: undefined,
				});
			});

			it('should create a TweenAction with full options', () => {
				const onUpdate = (value: number) => [{ type: 'CUSTOM_UPDATE', value }];
				const onComplete = () => [{ type: 'CUSTOM_COMPLETE' }];

				const action = createTween('complex-tween', 0.5, 2.0, 1000, {
					ease: 'Power2',
					onUpdate,
					onComplete,
				});

				expect(action).toEqual({
					type: '@mana/TWEEN',
					tweenId: 'complex-tween',
					from: 0.5,
					to: 2.0,
					duration: 1000,
					ease: 'Power2',
					onUpdate,
					onComplete,
				});
			});
		});

		describe('stopTween', () => {
			it('should create a StopTweenAction', () => {
				const action = stopTween('running-tween');

				expect(action).toEqual({
					type: '@mana/STOP_TWEEN',
					tweenId: 'running-tween',
				});
			});
		});

		describe('createSequence', () => {
			it('should create a SequenceAction without delay', () => {
				const actions: ManaMsg[] = [
					setVisible('element1', true),
					setFillColor('element1', 0xff0000),
				];

				const sequence = createSequence('test-sequence', actions);

				expect(sequence).toEqual({
					type: '@mana/SEQUENCE',
					sequenceId: 'test-sequence',
					actions,
					delayBetween: undefined,
				});
			});

			it('should create a SequenceAction with delay', () => {
				const actions: ManaMsg[] = [
					moveTo('character', 100, 100),
					moveTo('character', 200, 200),
				];

				const sequence = createSequence('movement-sequence', actions, 300);

				expect(sequence).toEqual({
					type: '@mana/SEQUENCE',
					sequenceId: 'movement-sequence',
					actions,
					delayBetween: 300,
				});
			});
		});

		describe('createDelay', () => {
			it('should create a DelayAction', () => {
				const onComplete = () => [setVisible('notification', false)];
				const delay = createDelay('hide-delay', 2000, onComplete);

				expect(delay).toEqual({
					type: '@mana/DELAY',
					delayId: 'hide-delay',
					duration: 2000,
					onComplete,
				});
			});
		});
	});

	describe('Type Guards', () => {
		it('should properly type all ManaMsg variants', () => {
			const messages: ManaMsg[] = [
				redrawShape('test', { fillColor: 0xff0000 }),
				updateElement('test', { x: 100 }),
				createTween('test', 0, 1, 500),
				stopTween('test'),
				createSequence('test', []),
				createDelay('test', 1000, () => []),
			];

			// All should be valid ManaMsg types
			messages.forEach(msg => {
				expect(typeof msg.type).toBe('string');
				expect(msg.type.startsWith('@mana/')).toBe(true);
			});
		});
	});
});