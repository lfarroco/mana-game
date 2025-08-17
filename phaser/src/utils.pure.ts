// Pure implementation for utils
// Utility functions with proper typing
export function pickRandom<T>(array: T[]): T | undefined {
	if (array.length === 0) return undefined;
	return array[Math.floor(Math.random() * array.length)];
}

export function devlog(_message: string) {
	// Add pure logic here
}
