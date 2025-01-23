
export async function tween(
	scene: Phaser.Scene,
	attributes: any,
) {

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
	scene: Phaser.Scene,
	tweens: any[],
) {
	for (let i = 0; i < tweens.length; i++) {
		await tween(scene, tweens[i]);
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