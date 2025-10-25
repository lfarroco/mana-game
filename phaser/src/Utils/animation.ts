import Phaser from "phaser";
import { scene } from "@Scenes/Battleground/BattlegroundScene";
import { getCurrentScene } from "@Models/State";

type CustomTweenProps =
	Omit<Phaser.Types.Tweens.TweenBuilderConfig,
		'targets' |
		'onComplete' |
		'onCompleteScope' |
		'onCompleteParams'
	> & {
		targets: Phaser.GameObjects.GameObject[];
		onComplete?: () => void;
	};

export async function tween(
	attributes: CustomTweenProps,
): Promise<void> {
	const { targets, onComplete: userOnCompleteCallback, ...restOfConfig } = attributes;

	if (targets.length === 0 || !targets[0]) {
		console.warn("Tween: No valid targets provided or first target is null/undefined. Aborting tween.");
		return Promise.resolve();
	}

	const scene = getCurrentScene();

	const phaserTweenConfig: Phaser.Types.Tweens.TweenBuilderConfig = {
		...restOfConfig,
		targets: targets,
	};

	if (phaserTweenConfig.ease === undefined) {
		phaserTweenConfig.ease = "Power2";
	}

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