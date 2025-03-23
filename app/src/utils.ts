export async function runPromisesInOrder(promiseFunctions: (() => Promise<any>)[]) {
	for (const func of promiseFunctions) {
		await func();
	}
	return promiseFunctions;
}

// picks n random elements from an array
export function pickRandom<T>(arr: T[], n: number): T[] {
	const shuffled = arr.sort(() => 0.5 - Math.random());
	return shuffled.slice(0, n);
}

// breaks lines of text into an array of lines that fit within the given width
export function breakLines(text: string, width: number) {
	return text.split(' ').reduce((acc, word) => {
		const line = acc[acc.length - 1];
		if (line.length + word.length > width) {
			acc.push(word);
		} else {
			acc[acc.length - 1] += ` ${word}`;
		}
		return acc;
	}
		, ['']).map(line => line.trim());
}

