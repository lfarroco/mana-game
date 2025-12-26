export type BlackHoleState = {
	active: boolean;
};

export function createServerBlackHoleState(): BlackHoleState {
	return {
		active: false,
	};
}

export function activateServerBlackHole(state: BlackHoleState): BlackHoleState {
	return {
		...state,
		active: true,
	};
}

export function deactivateServerBlackHole(state: BlackHoleState): BlackHoleState {
	return {
		...state,
		active: false,
	};
}
