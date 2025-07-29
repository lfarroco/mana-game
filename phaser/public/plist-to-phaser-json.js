// Usage: node plist-to-phaser-json.js boss_andromeda.plist boss_andromeda.json
const fs = require('fs');
const plist = require('plist');

if (process.argv.length < 4) {
	console.error('Usage: node plist-to-phaser-json.js <input.plist> <output.json>');
	process.exit(1);
}

const input = process.argv[2];
const output = process.argv[3];

const xml = fs.readFileSync(input, 'utf8');
const data = plist.parse(xml);

const frames = {};
for (const [frameName, frameData] of Object.entries(data.frames)) {
	// Parse the frame string: {{x,y},{w,h}}
	const match = /\{\{(\d+),(\d+)\},\{(\d+),(\d+)\}\}/.exec(frameData.frame);
	if (!match) continue;
	const [, x, y, w, h] = match.map(Number);
	frames[frameName] = {
		frame: { x, y, w, h },
		rotated: frameData.rotated || false,
		trimmed: false,
		spriteSourceSize: { x: 0, y: 0, w, h },
		sourceSize: { w, h },
	};
}

const json = {
	frames,
	meta: {
		image: data.metadata.textureFileName,
		size: data.metadata.size,
		scale: '1',
		format: 'RGBA8888',
	}
};

fs.writeFileSync(output, JSON.stringify(json, null, 2));
console.log('Converted', input, 'to', output);
