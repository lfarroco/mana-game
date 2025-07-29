// Usage: node plist-to-phaser-json.js boss_andromeda.plist boss_andromeda.json
const fs = require('fs');
const plist = require('plist');


if (process.argv.length < 3) {
	console.error('Usage: node plist-to-phaser-json.js <input.plist>');
	process.exit(1);
}

const input = process.argv[2];
const base = input.replace(/\.plist$/i, '');
const output = base + '.json';
const animsOutput = base + '-anims.json';

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


// --- Animation JSON generation ---
// Group frames by animation type (idle, attack, death)
const animTypes = ['idle', 'attack', 'death'];
const anims = [];
const frameNames = Object.keys(frames);

for (const type of animTypes) {
	// Find all frames matching this animation type
	const regex = new RegExp(`_(?:${type})_(\\d+)\\.png$`);
	const matching = frameNames
		.map(name => {
			const m = name.match(regex);
			return m ? { name, idx: parseInt(m[1], 10) } : null;
		})
		.filter(Boolean)
		.sort((a, b) => a.idx - b.idx);

	if (matching.length > 0) {
		let repeat = -1;
		if (type === 'death' || type === 'attack') repeat = 0;
		anims.push({
			key: type,
			type: 'frame',
			frames: matching.map(f => ({ frame: f.name })),
			frameRate: 12,
			repeat
		});
	}
}

// Write atlas JSON
fs.writeFileSync(output, JSON.stringify(json, null, 2));
console.log('Converted', input, 'to', output);

// Write animation JSON (same basename, -anims.json)
fs.writeFileSync(animsOutput, JSON.stringify({ anims }, null, 2));
console.log('Generated animations', animsOutput);
