
type Vec = { x: number, y: number };

export const distanceBetween = (a: Vec) => (b: Vec) => {
	return Math.sqrt(
		Math.pow(a.x - b.x, 2) +
		Math.pow(a.y - b.y, 2)
	);
}