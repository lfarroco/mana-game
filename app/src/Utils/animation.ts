
export async function tween(
	attributes: any,
) {

	const { scene } = attributes.targets[0];

	return new Promise<void>((resolve, _reject) => {
		scene.add.tween({
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

export async function delay(
	scene: Phaser.Scene,
	duration: number,
) {
	return new Promise<void>((resolve, _reject) => {
		scene.time.addEvent(
			{
				delay: duration,
				callback: () => {
					resolve();
				}
			}
		);
	});
}