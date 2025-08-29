import Phaser from "phaser";
import { scene } from "@Scenes/Battleground/BattlegroundScene";

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
	const { targets, onComplete: userOnCompleteCallback, ...restOfConfig } = attributes;

	// Check if there are any targets and if the first target is valid
	if (targets.length === 0 || !targets[0]) {
		console.warn("Tween: No valid targets provided or first target is null/undefined. Aborting tween.");
		return Promise.resolve(); // Or reject, depending on desired error handling
	}

	const firstTarget = targets[0];

	//@ts-ignore
	const scene: Phaser.Scene = firstTarget.scene;

	if (!scene) {
		console.warn("Tween: First target is missing a scene. Aborting tween.", firstTarget);
		return Promise.resolve();
	}

	// Build the configuration for Phaser's tween manager
	const phaserTweenConfig: Phaser.Types.Tweens.TweenBuilderConfig = {
		...restOfConfig,
		targets: targets, // Pass the original targets (single or array)
	};

	// Apply default ease if not specified by the caller
	if (phaserTweenConfig.ease === undefined) {
		phaserTweenConfig.ease = "Power2";
	}

	// Apply default duration if not specified
	if (phaserTweenConfig.duration === undefined) {
		phaserTweenConfig.duration = 200;
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
	duration: number,
) => new Promise<void>((resolve) => {
	scene.time.addEvent(
		{
			delay: duration,
			callback: () => {
				resolve();
			}
		}
	);
});