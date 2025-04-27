/**
 * Creates an array of Phaser Text objects with styled segments based on input string.
 * Supports custom styling by using syntax: [text=color] to color specific words.
 * 
 * @param scene - The Phaser scene to add the text objects to
 * @param config - Optional text style configuration to apply to all text segments
 * @param input - The input string to parse and style, can contain [word=color] syntax
 * 
 * @returns An array of Phaser.GameObjects.Text objects representing the styled segments
 * 
 * @example
 * // Creates text with the word "health" colored in red
 * const textSegments = styledText(scene, { fontSize: '24px' }, "Your [health=red] is low");
 * 
 * // The returned segments can be iterated over or added to a container
 * 
 * // Positionining the text segments in a row
 * let xPos = 100;
 * textSegments.forEach(segment => {
 *   segment.setPosition(xPos, 200);
 *   xPos += segment.width;
 * });
 */
import { defaultTextConfig } from "../Scenes/Battleground/constants";


export function styledText(scene: Phaser.Scene, config: Phaser.Types.GameObjects.Text.TextStyle = {}, input: string = "") {
	const result: Phaser.GameObjects.Text[] = [];
	let i = 0;
	let currentText = '';

	while (i < input.length) {
		if (input[i] === '[') {
			// Push any normal text collected so far
			if (currentText) {
				const segment = scene.add.text(0, 0, currentText, { ...defaultTextConfig, ...config });
				result.push(segment);
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

			const segment = scene.add.text(0, 0, word, { ...defaultTextConfig, ...config, color });
			result.push(segment);

			i = endBracket + 1;
		} else {
			currentText += input[i];
			i++;
		}
	}

	// Push any leftover text
	if (currentText) {
		const segment = scene.add.text(0, 0, currentText, { ...defaultTextConfig, ...config });
		result.push(segment);
	}

	result.forEach((segment, index) => {
		// make each segment start at the end of the previous one
		if (index > 0) {
			const prevSegment = result[index - 1];
			segment.setPosition(prevSegment.x + prevSegment.width, prevSegment.y);
		} else {
			// First segment starts at (0, 0)
			segment.setPosition(0, 0);
		}
	});


	return result;
}