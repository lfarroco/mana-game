// goes from green (100) to yellow (50) to red (0), in a gradient
export const hpColor = (hp: number, maxHp: number) => {
	const ratio = hp / maxHp;
	if (ratio > 0.5) {
		return `0x${Math.floor(255 - 255 * (ratio * 2 - 1)).toString(16)}ff00`

	} else {
		return `0xff${Math.floor(255 * (ratio * 2)).toString(16)}00`
	}
};

export const hpColorRgba = (hp: number, maxHp: number) => {
	const ratio = hp / maxHp;
	if (ratio > 0.5) {
		return `rgba(${Math.floor(255 - 255 * (ratio * 2 - 1))}, 255, 0, 1)`

	} else {
		return `rgba(255, ${Math.floor(255 * (ratio * 2))}, 0, 1)`
	}
}
