import { getState } from "../Models/State";

export async function tween(
	attributes: {
		targets: any[],
	} & {
		[key: string]: any
	},
) {

	const { scene } = attributes.targets[0];

	if (!scene) {
		console.warn("No scene found in tween attributes");
		return;
	}

	if (attributes.duration) {
		attributes.duration = attributes.duration / scene.speed;
	} else {
		attributes.duration = 200;
	}
	if (attributes.delay) {
		attributes.delay = attributes.delay / scene.speed;
	}

	return new Promise<void>((resolve, _reject) => {
		scene.add.tween({
			ease: "Power2",
			...attributes,
			onComplete: () => {
				if (attributes.onComplete) {
					attributes.onComplete();
				}
				resolve();
			}
		});

	});
}

export async function tweenSequence(
	tweens: any[],
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