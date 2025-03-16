import { Chara } from "../Chara";
import { tweenSequence } from "../../../Utils/animation";
import { HALF_TILE_WIDTH } from "../../../Scenes/Battleground/constants";

export async function bashPieceAnimation(
	activeChara: Chara,
	target: { x: number, y: number },
) {

	const { scene } = activeChara;
	const { state } = scene;

	const backMovementDuration = 300 / state.options.speed;
	// The actual "strike" happens at the end of the forward movement
	const forwardMovementDuration = 200 / state.options.speed;

	const returnMovementDuration = 300 / state.options.speed;

	const backDistance = HALF_TILE_WIDTH;
	const forwardDistance = backDistance * 2;

	const directionVector = Phaser.Math.Angle.BetweenPoints(
		activeChara.container,
		target
	);
	const { x, y } = activeChara.container;

	await tweenSequence(
		[{
			targets: [activeChara.container],
			x: x - Math.cos(directionVector) * backDistance,
			y: y - Math.sin(directionVector) * backDistance,
			duration: backMovementDuration,
		},
		{
			targets: [activeChara.container],
			x: x + Math.cos(directionVector) * forwardDistance,
			y: y + Math.sin(directionVector) * forwardDistance,
			duration: forwardMovementDuration,
			onComplete: () => {
				// const audio = scene.sound.add("audio/punch1");
				// audio.volume = state.options.soundVolume;
				// audio.play();
			}
		},
		{
			targets: [activeChara.container],
			x, y,
			duration: returnMovementDuration,
		}
		]);

}
