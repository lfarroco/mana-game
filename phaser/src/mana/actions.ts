/**
 * Built-in Mana actions and message types
 * 
 * These are common operations that can be composed with user message types:
 * type MyMsg = ManaMsg | { type: 'MY_CUSTOM_ACTION', payload: string };
 */

import type { ComponentState } from './types';

/**
 * Action to redraw a shape element with new properties
 */
export type RedrawShapeAction = {
	readonly type: '@mana/REDRAW_SHAPE';
	readonly elementId: string;
	readonly properties: {
		readonly fillColor?: number;
		readonly fillAlpha?: number;
		readonly strokeColor?: number;
		readonly strokeWidth?: number;
		readonly strokeAlpha?: number;
		// Shape-specific properties
		readonly width?: number;
		readonly height?: number;
		readonly radius?: number; // For circles and rounded rectangles
	};
};

/**
 * Action to update element properties
 */
export type UpdateElementAction = {
	readonly type: '@mana/UPDATE_ELEMENT';
	readonly elementId: string;
	readonly properties: {
		readonly x?: number;
		readonly y?: number;
		readonly alpha?: number;
		readonly visible?: boolean;
		readonly rotation?: number;
		readonly scale?: { readonly x: number; readonly y: number };
	};
};

/**
 * Action to create a tween animation
 * The tween will interpolate from 'from' to 'to' and call onUpdate/onComplete handlers
 * which can return messages to be dispatched
 */
export type TweenAction<Msg = any> = {
	readonly type: '@mana/TWEEN';
	readonly tweenId: string; // Unique ID to track/cancel tweens
	readonly from: number;
	readonly to: number;
	readonly duration: number;
	readonly ease?: string;
	readonly onUpdate?: (value: number) => readonly Msg[];
	readonly onComplete?: () => readonly Msg[];
};

/**
 * Action to stop/cancel a running tween
 */
export type StopTweenAction = {
	readonly type: '@mana/STOP_TWEEN';
	readonly tweenId: string;
};

/**
 * Action to execute a sequence of actions with optional delays between them
 */
export type SequenceAction<Msg = any> = {
	readonly type: '@mana/SEQUENCE';
	readonly sequenceId: string;
	readonly actions: readonly Msg[];
	readonly delayBetween?: number;
};

/**
 * Action to delay execution and dispatch messages after a timeout
 */
export type DelayAction<Msg = any> = {
	readonly type: '@mana/DELAY';
	readonly delayId: string;
	readonly duration: number;
	readonly onComplete: () => readonly Msg[];
};

/**
 * Action to create a color tween animation
 * Automatically interpolates between two hex colors
 */
export type ColorTweenAction<Msg = any> = {
	readonly type: '@mana/COLOR_TWEEN';
	readonly tweenId: string;
	readonly elementId: string;
	readonly property: 'fillColor' | 'strokeColor';
	readonly fromColor: number;
	readonly toColor: number;
	readonly duration: number;
	readonly ease?: string;
	readonly onComplete?: () => readonly Msg[];
};

/**
 * Action to set element state
 * Allows storing arbitrary state data on elements for component logic
 */
export type SetElementStateAction = {
	readonly type: '@mana/SET_ELEMENT_STATE';
	readonly elementId: string;
	readonly state: Record<string, any>;
};

/**
 * Action to update element state
 * Merges new state with existing state
 */
export type UpdateElementStateAction = {
	readonly type: '@mana/UPDATE_ELEMENT_STATE';
	readonly elementId: string;
	readonly state: Record<string, any>;
};

/**
 * Action to animate any element property
 * Supports animating x, y, alpha, rotation, scale, etc.
 */
export type PropertyTweenAction<Msg = any> = {
	readonly type: '@mana/PROPERTY_TWEEN';
	readonly tweenId: string;
	readonly elementId: string;
	readonly property: string;
	readonly from: number;
	readonly to: number;
	readonly duration: number;
	readonly ease?: string;
	readonly onComplete?: () => readonly Msg[];
};

/**
 * Action to update a shader uniform
 * Allows directly setting shader uniform values
 */
export type UpdateShaderUniformAction = {
	readonly type: '@mana/UPDATE_SHADER_UNIFORM';
	readonly elementId: string;
	readonly uniform: string;
	readonly value: any; // Can be number, array, etc.
};

/**
 * Union type of all built-in Mana messages
 */
export type ManaMsg = RedrawShapeAction | UpdateElementAction | TweenAction | StopTweenAction | SequenceAction | DelayAction | ColorTweenAction | SetElementStateAction | UpdateElementStateAction | PropertyTweenAction | UpdateShaderUniformAction;

/**
 * Helper to create a redraw shape action
 */
export const redrawShape = (
	elementId: string,
	properties: RedrawShapeAction['properties']
): RedrawShapeAction => ({
	type: '@mana/REDRAW_SHAPE',
	elementId,
	properties,
});

/**
 * Helper to create an update element action
 */
export const updateElement = (
	elementId: string,
	properties: UpdateElementAction['properties']
): UpdateElementAction => ({
	type: '@mana/UPDATE_ELEMENT',
	elementId,
	properties,
});

/**
 * Helper to redraw a rectangle with a new fill color
 */
export const setFillColor = (elementId: string, fillColor: number): RedrawShapeAction => ({
	type: '@mana/REDRAW_SHAPE',
	elementId,
	properties: { fillColor },
});

/**
 * Helper to change element visibility
 */
export const setVisible = (elementId: string, visible: boolean): UpdateElementAction => ({
	type: '@mana/UPDATE_ELEMENT',
	elementId,
	properties: { visible },
});

/**
 * Helper to move an element to a new position
 */
export const moveTo = (elementId: string, x: number, y: number): UpdateElementAction => ({
	type: '@mana/UPDATE_ELEMENT',
	elementId,
	properties: { x, y },
});

/**
 * Helper to create a tween action
 */
export const createTween = <Msg>(
	tweenId: string,
	from: number,
	to: number,
	duration: number,
	options?: {
		ease?: string;
		onUpdate?: (value: number) => readonly Msg[];
		onComplete?: () => readonly Msg[];
	}
): TweenAction<Msg> => ({
	type: '@mana/TWEEN',
	tweenId,
	from,
	to,
	duration,
	ease: options?.ease,
	onUpdate: options?.onUpdate,
	onComplete: options?.onComplete,
});

/**
 * Helper to stop a running tween
 */
export const stopTween = (tweenId: string): StopTweenAction => ({
	type: '@mana/STOP_TWEEN',
	tweenId,
});

/**
 * Helper to create a sequence action
 */
export const createSequence = <Msg>(
	sequenceId: string,
	actions: readonly Msg[],
	delayBetween?: number
): SequenceAction<Msg> => ({
	type: '@mana/SEQUENCE',
	sequenceId,
	actions,
	delayBetween,
});

/**
 * Helper to create a delay action
 */
export const createDelay = <Msg>(
	delayId: string,
	duration: number,
	onComplete: () => readonly Msg[]
): DelayAction<Msg> => ({
	type: '@mana/DELAY',
	delayId,
	duration,
	onComplete,
});

/**
 * Helper to create a color tween action
 */
export const createColorTween = <Msg>(
	tweenId: string,
	elementId: string,
	property: 'fillColor' | 'strokeColor',
	fromColor: number,
	toColor: number,
	duration: number,
	options?: {
		ease?: string;
		onComplete?: () => readonly Msg[];
	}
): ColorTweenAction<Msg> => ({
	type: '@mana/COLOR_TWEEN',
	tweenId,
	elementId,
	property,
	fromColor,
	toColor,
	duration,
	ease: options?.ease,
	onComplete: options?.onComplete,
});

/**
 * Helper to create a set element state action
 */
export const setElementState = (
	elementId: string,
	state: Record<string, any>
): SetElementStateAction => ({
	type: '@mana/SET_ELEMENT_STATE',
	elementId,
	state,
});

/**
 * Helper to create an update element state action
 */
export const updateElementState = (
	elementId: string,
	state: Record<string, any>
): UpdateElementStateAction => ({
	type: '@mana/UPDATE_ELEMENT_STATE',
	elementId,
	state,
});

/**
 * Helper to create a property tween action
 */
export const createPropertyTween = <Msg>(
	tweenId: string,
	elementId: string,
	property: string,
	from: number,
	to: number,
	duration: number,
	options?: {
		ease?: string;
		onComplete?: () => readonly Msg[];
	}
): PropertyTweenAction<Msg> => ({
	type: '@mana/PROPERTY_TWEEN',
	tweenId,
	elementId,
	property,
	from,
	to,
	duration,
	ease: options?.ease,
	onComplete: options?.onComplete,
});

/**
 * Helper to create an update shader uniform action
 */
export const updateShaderUniform = (
	elementId: string,
	uniform: string,
	value: any
): UpdateShaderUniformAction => ({
	type: '@mana/UPDATE_SHADER_UNIFORM',
	elementId,
	uniform,
	value,
});

// Store active tweens by ID
const activeTweens = new Map<string, Phaser.Tweens.Tween>();

// Store active sequences by ID
const activeSequences = new Map<string, { currentIndex: number; timer?: Phaser.Time.TimerEvent }>();

// Store active delays by ID
const activeDelays = new Map<string, Phaser.Time.TimerEvent>();

/**
 * Built-in handler for Mana messages
 * Processes common operations like redrawing shapes and creating tweens
 * 
 * Usage in your update function:
 * ```typescript
 * const update = (msg: ManaMsg | MyMsg, state: ComponentState<ManaMsg | MyMsg>) => {
 *   // Handle Mana messages first
 *   const newState = handleManaMsg(msg, state);
 *   if (newState !== state) return newState; // Message was handled
 *   
 *   // Handle your custom messages
 *   switch (msg.type) {
 *     case 'MY_ACTION':
 *       // ... your logic
 *   }
 *   return state;
 * };
 * ```
 */
export const handleManaMsg = <Msg extends ManaMsg>(
	msg: Msg,
	state: ComponentState<Msg>
): ComponentState<Msg> => {
	switch (msg.type) {
		case '@mana/REDRAW_SHAPE': {
			const element = state.elements[msg.elementId];
			if (!element || !('clear' in element)) {
				console.warn(`[Mana] Cannot redraw element: ${msg.elementId} not found or not a graphics object`);
				return state;
			}

			const graphics = element as Phaser.GameObjects.Graphics;
			const data = state.elementData.get(msg.elementId);

			if (!data) {
				console.warn(`[Mana] Cannot redraw element: ${msg.elementId} data not found`);
				return state;
			}

			// Merge new properties with existing data
			const mergedProps = { ...data, ...msg.properties };

			// Clear and redraw based on element type
			graphics.clear();

			switch (data.type) {
				case 'rect': {
					const width = mergedProps.width!;
					const height = mergedProps.height!;
					if (mergedProps.fillColor !== undefined) {
						graphics.fillStyle(mergedProps.fillColor, mergedProps.fillAlpha ?? 1);
						graphics.fillRect(-width / 2, -height / 2, width, height);
					}
					if (mergedProps.strokeColor !== undefined) {
						graphics.lineStyle(mergedProps.strokeWidth ?? 1, mergedProps.strokeColor, mergedProps.strokeAlpha ?? 1);
						graphics.strokeRect(-width / 2, -height / 2, width, height);
					}
					break;
				}
				case 'roundrect': {
					const width = mergedProps.width!;
					const height = mergedProps.height!;
					const radius = mergedProps.radius!;
					if (mergedProps.fillColor !== undefined) {
						graphics.fillStyle(mergedProps.fillColor, mergedProps.fillAlpha ?? 1);
						graphics.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
					}
					if (mergedProps.strokeColor !== undefined) {
						graphics.lineStyle(mergedProps.strokeWidth ?? 1, mergedProps.strokeColor, mergedProps.strokeAlpha ?? 1);
						graphics.strokeRoundedRect(-width / 2, -height / 2, width, height, radius);
					}
					break;
				}
				case 'circle': {
					const radius = mergedProps.radius!;
					if (mergedProps.fillColor !== undefined) {
						graphics.fillStyle(mergedProps.fillColor, mergedProps.fillAlpha ?? 1);
						graphics.fillCircle(0, 0, radius);
					}
					if (mergedProps.strokeColor !== undefined) {
						graphics.lineStyle(mergedProps.strokeWidth ?? 1, mergedProps.strokeColor, mergedProps.strokeAlpha ?? 1);
						graphics.strokeCircle(0, 0, radius);
					}
					break;
				}
				case 'ellipse': {
					const width = mergedProps.width!;
					const height = mergedProps.height!;
					if (mergedProps.fillColor !== undefined) {
						graphics.fillStyle(mergedProps.fillColor, mergedProps.fillAlpha ?? 1);
						graphics.fillEllipse(0, 0, width, height);
					}
					if (mergedProps.strokeColor !== undefined) {
						graphics.lineStyle(mergedProps.strokeWidth ?? 1, mergedProps.strokeColor, mergedProps.strokeAlpha ?? 1);
						graphics.strokeEllipse(0, 0, width, height);
					}
					break;
				}
			}

			return state;
		}

		case '@mana/UPDATE_ELEMENT': {
			const element = state.elements[msg.elementId];
			if (!element) {
				console.warn(`[Mana] Cannot update element: ${msg.elementId} not found`);
				return state;
			}

			const props = msg.properties;

			// Cast to any to access common game object properties
			const gameObject = element as any;

			if (props.x !== undefined || props.y !== undefined) {
				if (gameObject.setPosition) {
					gameObject.setPosition(
						props.x ?? gameObject.x,
						props.y ?? gameObject.y
					);
				}
			}
			if (props.alpha !== undefined && gameObject.setAlpha) {
				gameObject.setAlpha(props.alpha);
			}
			if (props.visible !== undefined && gameObject.setVisible) {
				gameObject.setVisible(props.visible);
			}
			if (props.rotation !== undefined && gameObject.setRotation) {
				gameObject.setRotation(props.rotation);
			}
			if (props.scale !== undefined && gameObject.setScale) {
				gameObject.setScale(props.scale.x, props.scale.y);
			}

			return state;
		}

		case '@mana/TWEEN': {
			// Stop existing tween with same ID if it exists
			const existingTween = activeTweens.get(msg.tweenId);
			if (existingTween) {
				existingTween.stop();
				activeTweens.delete(msg.tweenId);
			}

			// Create the tween
			const tween = state.scene.tweens.addCounter({
				from: msg.from,
				to: msg.to,
				duration: msg.duration,
				ease: msg.ease || 'Power2',
				onUpdate: (tween) => {
					if (msg.onUpdate) {
						const value = tween.getValue();
						const messages = msg.onUpdate(value);
						if (messages.length > 0) {
							// Process messages immediately for smooth updates
							messages.forEach((m) => {
								handleManaMsg(m as any, state);
							});
						}
					}
				},
				onComplete: () => {
					// Clean up tween reference
					activeTweens.delete(msg.tweenId);

					// Dispatch completion messages
					if (msg.onComplete) {
						const messages = msg.onComplete();
						if (messages.length > 0) {
							messages.forEach((m) => {
								handleManaMsg(m as any, state);
							});
						}
					}
				},
			});

			// Store tween reference
			activeTweens.set(msg.tweenId, tween);

			return state;
		}

		case '@mana/STOP_TWEEN': {
			const tween = activeTweens.get(msg.tweenId);
			if (tween) {
				tween.stop();
				activeTweens.delete(msg.tweenId);
			}
			return state;
		}

		case '@mana/SEQUENCE': {
			// Stop existing sequence with same ID if it exists
			const existingSequence = activeSequences.get(msg.sequenceId);
			if (existingSequence) {
				if (existingSequence.timer) {
					existingSequence.timer.destroy();
				}
				activeSequences.delete(msg.sequenceId);
			}

			// Start executing the sequence
			const executeNext = (index: number) => {
				if (index >= msg.actions.length) {
					// Sequence complete
					activeSequences.delete(msg.sequenceId);
					return;
				}

				const action = msg.actions[index];
				// Process the action immediately
				handleManaMsg(action as any, state);

				// Schedule next action if there's a delay and more actions
				if (index < msg.actions.length - 1 && msg.delayBetween && msg.delayBetween > 0) {
					const timer = state.scene.time.delayedCall(msg.delayBetween, () => {
						executeNext(index + 1);
					});
					activeSequences.set(msg.sequenceId, { currentIndex: index + 1, timer });
				} else if (index < msg.actions.length - 1) {
					// No delay, execute immediately
					executeNext(index + 1);
				} else {
					// Last action completed
					activeSequences.delete(msg.sequenceId);
				}
			};

			// Start the sequence
			executeNext(0);

			return state;
		}

		case '@mana/DELAY': {
			// Stop existing delay with same ID if it exists
			const existingDelay = activeDelays.get(msg.delayId);
			if (existingDelay) {
				existingDelay.destroy();
				activeDelays.delete(msg.delayId);
			}

			// Create the delay
			const timer = state.scene.time.delayedCall(msg.duration, () => {
				// Clean up delay reference
				activeDelays.delete(msg.delayId);

				// Dispatch completion messages
				const messages = msg.onComplete();
				if (messages.length > 0) {
					messages.forEach((m) => {
						handleManaMsg(m as any, state);
					});
				}
			});

			// Store delay reference
			activeDelays.set(msg.delayId, timer);

			return state;
		}

		case '@mana/COLOR_TWEEN': {
			// Stop existing tween with same ID if it exists
			const existingTween = activeTweens.get(msg.tweenId);
			if (existingTween) {
				existingTween.stop();
				activeTweens.delete(msg.tweenId);
			}

			// Extract RGB components for proper color interpolation
			const fromR = (msg.fromColor >> 16) & 0xff;
			const fromG = (msg.fromColor >> 8) & 0xff;
			const fromB = msg.fromColor & 0xff;

			const toR = (msg.toColor >> 16) & 0xff;
			const toG = (msg.toColor >> 8) & 0xff;
			const toB = msg.toColor & 0xff;

			// Create the tween
			const tween = state.scene.tweens.addCounter({
				from: 0,
				to: 1,
				duration: msg.duration,
				ease: msg.ease || 'Power2',
				onUpdate: (tween) => {
					const t = tween.getValue();
					// Interpolate each RGB component
					const r = Math.round(fromR + (toR - fromR) * t);
					const g = Math.round(fromG + (toG - fromG) * t);
					const b = Math.round(fromB + (toB - fromB) * t);
					// Combine back into hex color
					const color = (r << 16) | (g << 8) | b;

					// Update the element with the new color
					const redrawMsg = {
						type: '@mana/REDRAW_SHAPE' as const,
						elementId: msg.elementId,
						properties: { [msg.property]: color },
					};
					handleManaMsg(redrawMsg as any, state);
				},
				onComplete: () => {
					// Clean up tween reference
					activeTweens.delete(msg.tweenId);

					// Dispatch completion messages
					if (msg.onComplete) {
						const messages = msg.onComplete();
						if (messages.length > 0) {
							messages.forEach((m) => {
								handleManaMsg(m as any, state);
							});
						}
					}
				},
			});

			// Store tween reference
			activeTweens.set(msg.tweenId, tween);

			return state;
		}

		case '@mana/SET_ELEMENT_STATE': {
			// Set the element state (replaces any existing state)
			state.elementState.set(msg.elementId, { ...msg.state });
			return state;
		}

		case '@mana/UPDATE_ELEMENT_STATE': {
			// Update the element state (merges with existing state)
			const existingState = state.elementState.get(msg.elementId) || {};
			state.elementState.set(msg.elementId, { ...existingState, ...msg.state });
			return state;
		}

		case '@mana/PROPERTY_TWEEN': {
			// Stop existing tween with same ID if it exists
			const existingTween = activeTweens.get(msg.tweenId);
			if (existingTween) {
				existingTween.stop();
				activeTweens.delete(msg.tweenId);
			}

			// Create the tween
			const tween = state.scene.tweens.addCounter({
				from: 0,
				to: 1,
				duration: msg.duration,
				ease: msg.ease || 'Power2',
				onUpdate: (tween) => {
					const t = tween.getValue();
					// Interpolate the property value
					const value = msg.from + (msg.to - msg.from) * t;

					// Update the element property directly
					const updateMsg = {
						type: '@mana/UPDATE_ELEMENT' as const,
						elementId: msg.elementId,
						properties: { [msg.property]: value },
					};
					handleManaMsg(updateMsg as any, state);
				},
				onComplete: () => {
					// Clean up tween reference
					activeTweens.delete(msg.tweenId);

					// Dispatch completion messages
					if (msg.onComplete) {
						const messages = msg.onComplete();
						if (messages.length > 0) {
							messages.forEach((m) => {
								handleManaMsg(m as any, state);
							});
						}
					}
				},
			});

			// Store tween reference
			activeTweens.set(msg.tweenId, tween);

			return state;
		}

		case '@mana/UPDATE_SHADER_UNIFORM': {
			const element = state.elements[msg.elementId];
			if (!element || !('setUniform' in element)) {
				console.warn(`[Mana] Cannot update shader uniform: ${msg.elementId} not found or not a shader`);
				return state;
			}

			const shader = element as Phaser.GameObjects.Shader;
			// Update the uniform value
			console.log(`[Mana] Updating shader uniform: ${msg.uniform} =`, msg.value);
			shader.setUniform(`${msg.uniform}.value`, msg.value);

			// Also update the element data so the uniform persists
			const data = state.elementData.get(msg.elementId);
			if (data && (data as any).uniforms) {
				(data as any).uniforms[msg.uniform] = msg.value;
			}

			return state;
		}

		default:
			return state;
	}
};
