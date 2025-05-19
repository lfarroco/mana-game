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

export function pickOne<a>(arr: a[]): a {
	const [item] = pickRandom(arr, 1);
	return item;
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

export function follows(a: { x: any; y: any; scene: { on: (arg0: string, arg1: () => void) => void; off: (arg0: string, arg1: () => void) => void; }; }, b: { x: any; y: any; on: (arg0: string, arg1: () => void) => void; }) {

	const follow = () => {
		a.x = b.x;
		a.y = b.y;
	}
	a.scene.on('update', follow);
	b.on('destroy', () => {
		a.scene.off('update', follow);
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
		}, {} as { [key: string]: string; });
	});
	return data;
}
