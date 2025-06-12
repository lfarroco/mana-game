import Phaser from "phaser";
import { getState } from "../Models/State";

/**
 * Defines the properties for our custom tween wrapper.
 * It omits 'targets' and 'onComplete'-related properties from Phaser's TweenBuilderConfig
 * as we define them more specifically for our wrapper's needs.
 */
type CustomTweenProps =
	Omit<Phaser.Types.Tweens.TweenBuilderConfig,
		'targets' |
		'onComplete' |
		'onCompleteScope' |
		'onCompleteParams'
	> & {
		/** The game object(s) to tween. Must have a 'scene' property. */
		targets: Phaser.GameObjects.GameObject[];
		/** Optional callback to execute when the tween completes, before the promise resolves. */
		onComplete?: () => void;
	};

export async function tween(
	attributes: CustomTweenProps,
): Promise<void> {
	const speed = getState().options.speed;

	const { targets, onComplete: userOnCompleteCallback, ...restOfConfig } = attributes;

	// Check if there are any targets and if the first target is valid
	if (targets.length === 0 || !targets[0]) {
		console.warn("Tween: No valid targets provided or first target is null/undefined. Aborting tween.");
		return Promise.resolve(); // Or reject, depending on desired error handling
	}

	const firstTarget = targets[0];

	//@ts-ignore
	const scene: Phaser.Scene = firstTarget;

	if (!scene) {
		console.warn("Tween: First target is missing a scene. Aborting tween.", firstTarget);
		return Promise.resolve();
	}

	// Build the configuration for Phaser's tween manager
	const phaserTweenConfig: Phaser.Types.Tweens.TweenBuilderConfig = {
		...restOfConfig, // Spread other config properties (like x, y, alpha, etc.)
		targets: targets, // Pass the original targets (single or array)
	};

	// Apply default ease if not specified by the caller
	if (phaserTweenConfig.ease === undefined) {
		phaserTweenConfig.ease = "Power2";
	}

	// Adjust duration based on speed, applying a default if none is provided
	if (typeof phaserTweenConfig.duration === 'number') {
		phaserTweenConfig.duration /= speed;
	} else if (typeof phaserTweenConfig.duration === 'function') {
		// Duration can be a function, scaling it isn't straightforward here.
		console.warn("Tween: Duration as a function is not automatically scaled by speed.");
	} else { // duration is undefined or not a number/function
		phaserTweenConfig.duration = (restOfConfig.duration === undefined ? 200 : Number(restOfConfig.duration) || 200) / speed;
	}

	// Adjust delay based on speed
	if (typeof phaserTweenConfig.delay === 'number') {
		phaserTweenConfig.delay /= speed;
	} else if (typeof phaserTweenConfig.delay === 'function') {
		console.warn("Tween: Delay as a function is not automatically scaled by speed.");
	}

	return new Promise<void>((resolve, _reject) => {
		scene.tweens.add({
			...phaserTweenConfig,
			onComplete: () => {
				if (userOnCompleteCallback) {
					userOnCompleteCallback();
				}
				resolve();
			}
		});

	});
}

export async function tweenSequence(
	tweens: CustomTweenProps[],
) {
	for (let i = 0; i < tweens.length; i++) {
		await tween(tweens[i]);
	}
}

export const delay = (
	scene: Phaser.Scene, // TODO: remove
	duration: number,
) => new Promise<void>((resolve, _reject) => {
	scene.time.addEvent(
		{
			delay: duration / getState().options.speed,
			callback: () => {
				resolve();
			}
		}
	);
});