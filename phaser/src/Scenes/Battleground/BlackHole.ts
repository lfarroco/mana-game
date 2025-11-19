import { MIDDLE_SCREEN } from "@Constants/constants";
import { getCurrentScene } from "@Models/State";
import { Shader } from "@PhaserIO";
import { arcaneTornadoFragmentShader } from "@Shaders/ArcaneTornado";

let blackHole: Phaser.GameObjects.Shader;
let timer: Phaser.Time.TimerEvent;
let dissolve = 0;

export function createBlackHole() {
	dissolve = 0;

	blackHole = Shader(
		arcaneTornadoFragmentShader,
		MIDDLE_SCREEN,
		{ width: 800, height: 800 }, [
		{ key: "color1", type: "3f", value: [0.0, 0.0, 0.0] }, // black core
		{ key: "color2", type: "3f", value: [0.2, 0.1, 0.2] }, // arcane purple
		{ key: "intensity", type: "1f", value: 0.1 },
		{ key: "speed", type: "1f", value: 1.0 },
		{ key: "dissolveProgress", type: "1f", value: dissolve },
	]);

	const scene = getCurrentScene();

	timer = scene.time.addEvent({
		delay: 100,
		repeat: 10,
		callback: () => {
			dissolve += 0.1;
			blackHole.setUniform("dissolveProgress.value", dissolve);
		},
	});
}

export function destroyBlackHole() {
	if (!blackHole) return;

	dissolve = 1;

	getCurrentScene().time.addEvent({
		delay: 100,
		repeat: 10,
		callback: () => {
			dissolve -= 0.1;
			blackHole.setUniform("dissolveProgress.value", dissolve);

			if (dissolve == 0) {
				blackHole.destroy();
				timer.destroy();
			}
		},
	});
}
