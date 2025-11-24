const fs = require('fs');
const path = require('path');

const DATA_FILE = '/Users/momo/dev/mana-game/phaser/public/assets/data/collections/base/data.json';
const HEROES_DIR = '/Users/momo/dev/mana-game/phaser/public/assets/heroes';

function getAllPics(obj, pics = new Set()) {
	if (!obj || typeof obj !== 'object') {
		return pics;
	}

	if (Array.isArray(obj)) {
		obj.forEach(item => getAllPics(item, pics));
	} else {
		for (const key in obj) {
			if (key === 'pic' && typeof obj[key] === 'string') {
				pics.add(obj[key]);
			} else {
				getAllPics(obj[key], pics);
			}
		}
	}
	return pics;
}

function getBaseName(filename) {
	if (filename.endsWith('-anims.json')) {
		return filename.replace('-anims.json', '');
	}
	const ext = path.extname(filename);
	if (['.png', '.json', '.plist'].includes(ext)) {
		return path.basename(filename, ext);
	}
	return filename;
}

function main() {
	const isDelete = process.argv.includes('--delete');

	console.log(`Reading data from: ${DATA_FILE}`);
	const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
	const usedPics = getAllPics(data);

	console.log(`Found ${usedPics.size} unique 'pic' references in data.json.`);
	// console.log('Used pics:', Array.from(usedPics).sort());

	console.log(`Scanning directory: ${HEROES_DIR}`);
	const files = fs.readdirSync(HEROES_DIR);

	let deletedCount = 0;
	let keptCount = 0;
	let unknownCount = 0;

	files.forEach(file => {
		if (file === '.DS_Store') return;

		const baseName = getBaseName(file);
		const filePath = path.join(HEROES_DIR, file);

		if (usedPics.has(baseName)) {
			keptCount++;
			// console.log(`[KEEP] ${file}`);
		} else {
			deletedCount++;
			if (isDelete) {
				console.log(`[DELETE] ${file}`);
				fs.unlinkSync(filePath);
			} else {
				console.log(`[WOULD DELETE] ${file}`);
			}
		}
	});

	console.log('\nSummary:');
	console.log(`Total files scanned: ${files.length}`);
	console.log(`Kept: ${keptCount}`);
	console.log(`Marked for deletion: ${deletedCount}`);

	if (!isDelete) {
		console.log('\nRun with --delete to actually delete files.');
	} else {
		console.log('\nDeletion complete.');
	}
}

main();
