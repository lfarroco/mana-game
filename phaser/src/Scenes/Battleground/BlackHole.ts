import { MIDDLE_SCREEN } from "@Constants/constants";
import { getCurrentScene } from "@Models/State";
import { Shader } from "@PhaserIO";
import { arcaneTornadoFragmentShader } from "@Shaders/ArcaneTornado";

let blackHole: Phaser.GameObjects.Shader;
let timer: Phaser.Time.TimerEvent;
let dissolve = 0;

export function initBlackHole() {
	dissolve = 0;

	blackHole = Shader(
		arcaneTornadoFragmentShader,
		MIDDLE_SCREEN,
		{ width: 800, height: 800 }, [
		{ key: "color1", type: "3f", value: [0.0, 0.0, 0.0] }, // black core
		{ key: "color2", type: "3f", value: [0.0, 0.0, 0.0] },
		{ key: "intensity", type: "1f", value: 0.1 },
		{ key: "speed", type: "1f", value: 1.0 },
		{ key: "dissolveProgress", type: "1f", value: dissolve },
	]);

	blackHole.setUniform("dissolveProgress.value", 0);

	return blackHole;
}

export function activateBlackHole() {
	if (!blackHole) return;

	dissolve = 0;
	const scene = getCurrentScene();

	if (timer) timer.destroy();

	timer = scene.time.addEvent({
		delay: 100,
		repeat: 10,
		callback: () => {
			dissolve += 0.1;
			blackHole.setUniform("dissolveProgress.value", dissolve);
		},
	});
}

export function deactivateBlackHole() {
	if (!blackHole) return;

	dissolve = 1;

	if (timer) timer.destroy();

	timer = getCurrentScene().time.addEvent({
		delay: 100,
		repeat: 10,
		callback: () => {
			dissolve -= 0.1;
			blackHole.setUniform("dissolveProgress.value", dissolve);
		},
	});
}
