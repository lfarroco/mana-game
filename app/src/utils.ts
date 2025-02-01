export async function runPromisesInOrder(promiseFunctions: (() => Promise<any>)[]) {
	for (const func of promiseFunctions) {
		await func();
	}
	return promiseFunctions;
}
