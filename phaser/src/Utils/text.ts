/**
 * Parses a string containing special [word=color] syntax into an array of text chunks.
 * 
 * Each chunk is an object with the text content and a color.
 * 
 * If no color is specified, the chunk defaults to `"default"`.
 * 
 * @param {string} input - The input string to parse.
 * @returns {{ text: string, color: string }[]} Array of parsed text chunks.
 * 
 * @example
 * const input = "When you [crit=red], [heal=green] 10 hp";
 * const parsed = parseText(input);
 * console.log(parsed);
 * // Output:
 * // [
 * //   { text: "When you ", color: "default" },
 * //   { text: "crit", color: "red" },
 * //   { text: ", ", color: "default" },
 * //   { text: "heal", color: "green" },
 * //   { text: " 10 hp", color: "default" }
 * // ]
 */
function parseText(input: string) {
	const result = [];
	let i = 0;
	let currentText = '';

	while (i < input.length) {
		if (input[i] === '[') {
			// Push any normal text collected so far
			if (currentText) {
				result.push({ text: currentText, color: 'default' });
				currentText = '';
			}

			// Parse inside the brackets
			let endBracket = input.indexOf(']', i);
			if (endBracket === -1) {
				// No closing bracket, treat as normal text
				currentText += input[i];
				i++;
				continue;
			}

			const content = input.substring(i + 1, endBracket);
			const [word, color] = content.split('=');
			result.push({ text: word, color: color || 'default' });

			i = endBracket + 1;
		} else {
			currentText += input[i];
			i++;
		}
	}

	// Push any leftover text
	if (currentText) {
		result.push({ text: currentText, color: 'default' });
	}

	return result;
}