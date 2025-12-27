import express from 'express';
import { runServerSideCombat } from '../src/Scenes/Battleground/serverCombatDemo.js';

const app = express();
const port = 3000;

app.get('/test-combat', (req, res) => {
	console.log('Received request for combat demo');
	try {
		// Capture console output to return it in the response
		const logs: string[] = [];
		const originalLog = console.log;
		console.log = (...args) => {
			logs.push(args.join(' '));
			originalLog.apply(console, args);
		};

		runServerSideCombat();

		// Restore console.log
		console.log = originalLog;

		res.json({
			success: true,
			logs: logs
		});
	} catch (error) {
		console.error('Error running combat:', error);
		res.status(500).json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		});
	}
});

app.listen(port, () => {
	console.log(`Server listening on port ${port}`);
});
