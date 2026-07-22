import { env } from "@Env";

type CustomTweenProps = Omit<
	Phaser.Types.Tweens.TweenBuilderConfig,
	"targets" | "onComplete" | "onCompleteScope" | "onCompleteParams"
> & {
	targets: Phaser.GameObjects.GameObject[] | Phaser.Geom.Mesh.Face[];
	onComplete?: () => void;
};

export async function tween(attributes: CustomTweenProps): Promise<void> {
	const { targets, onComplete: userOnCompleteCallback, ...restOfConfig } = attributes;

	if (targets.length === 0 || !targets[0]) {
		return Promise.resolve();
	}

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
		env.scene.tweens.add({
			...phaserTweenConfig,
			onComplete: () => {
				if (userOnCompleteCallback) {
					userOnCompleteCallback();
				}
				resolve();
			},
		});
	});
}

export const delay = (duration: number) =>
	new Promise<void>((resolve) => {
		env.scene.time.addEvent({
			delay: duration,
			callback: () => {
				resolve();
			},
		});
	});
