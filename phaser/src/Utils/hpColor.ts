// Color constants for HP display
const HP_COLOR_CONSTANTS = {
	MAX_COLOR_VALUE: 255,
	HEALTH_THRESHOLD: 0.5,
	FULL_ALPHA: 1,
} as const;

// goes from green (100) to yellow (50) to red (0), in a gradient
export const hpColor = (hp: number, maxHp: number): string => {
	const ratio = hp / maxHp;
	const { MAX_COLOR_VALUE, HEALTH_THRESHOLD } = HP_COLOR_CONSTANTS;

	if (ratio > HEALTH_THRESHOLD) {
		return `0x${Math.floor(MAX_COLOR_VALUE - MAX_COLOR_VALUE * (ratio * 2 - 1)).toString(16)}ff00`;
	} else {
		return `0xff${Math.floor(MAX_COLOR_VALUE * (ratio * 2)).toString(16)}00`;
	}
};

export const hpColorRgba = (hp: number, maxHp: number): string => {
	const ratio = hp / maxHp;
	const { MAX_COLOR_VALUE, HEALTH_THRESHOLD, FULL_ALPHA } = HP_COLOR_CONSTANTS;

	if (ratio > HEALTH_THRESHOLD) {
		return `rgba(${Math.floor(MAX_COLOR_VALUE - MAX_COLOR_VALUE * (ratio * 2 - 1))}, ${MAX_COLOR_VALUE}, 0, ${FULL_ALPHA})`;
	} else {
		return `rgba(${MAX_COLOR_VALUE}, ${Math.floor(MAX_COLOR_VALUE * (ratio * 2))}, 0, ${FULL_ALPHA})`;
	}
};
