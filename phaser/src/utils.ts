export async function runPromisesInOrder(promiseFunctions: (() => Promise<any>)[]) {
	for (const func of promiseFunctions) {
		await func();
	}
	return promiseFunctions;
}

// picks n random elements from an array using Fisher-Yates shuffle
export function pickRandom<T>(arr: T[], n: number): T[] {
	const copy = [...arr]; // Don't mutate the original array
	// Fisher-Yates shuffle
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy.slice(0, n);
}

export function pickOne<a>(arr: a[]): a {
	const [item] = pickRandom(arr, 1);
	return item;
}

export function randomBetween(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
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
	}, ['']).map(line => line.trim());
}

export function follows(
	follower: { x: number; y: number; scene: { on: (event: string, callback: () => void) => void; off: (event: string, callback: () => void) => void; }; },
	target: { x: number; y: number; on: (event: string, callback: () => void) => void; }
) {
	const follow = () => {
		follower.x = target.x;
		follower.y = target.y;
	};

	follower.scene.on('update', follow);
	target.on('destroy', () => {
		follower.scene.off('update', follow);
	});
}
export function parseTable(table: string) {
	const rows = table.trim().split("\n").map((r) => r.trim());
	const header = rows[0].split("|").map((h) => h.trim());
	const data = rows.slice(2).map((r) => {
		const cells = r.split("|").map((c) => c.trim());
		return header.reduce((acc, h, i) => {
			acc[h] = cells[i];
			return acc;
		}, {} as { [key: string]: string });
	});
	return data;
}

export function devlog(msg: string) {
	if (process.env.NODE_ENV === 'development') {
		console.log(msg);
	}
}