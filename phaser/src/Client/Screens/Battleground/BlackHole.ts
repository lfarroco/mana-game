import { MIDDLE_SCREEN } from "@Constants/constants";
import { Shader } from "@PhaserIO";
import { arcaneTornadoFragmentShader } from "@Shaders/ArcaneTornado";
import type { BlackHoleState } from "@Core/Combat/BlackHoleState";

export type { BlackHoleState } from "@Core/Combat/BlackHoleState";

export function initBlackHole(): BlackHoleState {
	const dissolve = 0;

	const blackHole = Shader(
		arcaneTornadoFragmentShader,
		MIDDLE_SCREEN,
		{ width: 800, height: 800 }, [
		{ key: "color1", type: "3f", value: [0.0, 0.0, 0.0] },
		{ key: "color2", type: "3f", value: [0.0, 0.0, 0.0] },
		{ key: "intensity", type: "1f", value: 0.1 },
		{ key: "speed", type: "1f", value: 1.0 },
		{ key: "dissolveProgress", type: "1f", value: dissolve },
	]);

	blackHole.setUniform("dissolveProgress.value", 0);
	blackHole.setDepth(-1000);

	return {
		blackHole,
		timer: null,
		dissolve,
	};
}

export function activateBlackHole(state: BlackHoleState): BlackHoleState {
	if (!state.blackHole) return state;

	if (state.timer) state.timer.destroy();

	const timer = io.scene.time.addEvent({
		delay: 100,
		repeat: 10,
		callback: () => {
			state.dissolve += 0.1;
			state.blackHole?.setUniform("dissolveProgress.value", state.dissolve);
		},
	});

	return {
		...state,
		dissolve: 1,
		timer,
	};
}

export function deactivateBlackHole(state: BlackHoleState): BlackHoleState {
	if (!state.blackHole) return state;

	if (state.timer) state.timer.destroy();

	const timer = io.scene.time.addEvent({
		delay: 100,
		repeat: 10,
		callback: () => {
			state.dissolve -= 0.1;
			state.blackHole?.setUniform("dissolveProgress.value", state.dissolve);
		},
	});

	return {
		...state,
		dissolve: 0,
		timer,
	};
}
