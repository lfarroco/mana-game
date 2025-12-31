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

import { MultiplayerServerManager } from './MultiplayerServerManager.js';

app.use(express.json());

// Simple in-memory session mapping for demo purposes
// In production, use proper session middleware
app.post('/multiplayer/connect', (req, res) => {
	const { playerId } = req.body;
	if (!playerId) {
		return res.status(400).json({ error: 'playerId required' });
	}
	const session = MultiplayerServerManager.getInstance().createSession(playerId);
	res.json({ success: true, session });
});

app.get('/multiplayer/state', (req, res) => {
	const { playerId } = req.query;
	if (!playerId || typeof playerId !== 'string') {
		return res.status(400).json({ error: 'playerId required' });
	}
	try {
		const options = MultiplayerServerManager.getInstance().getPhaseOptions(playerId);
		res.json(options);
	} catch (e) {
		res.status(404).json({ error: e instanceof Error ? e.message : 'Error fetching state' });
	}
});

app.post('/multiplayer/action', (req, res) => {
	const { playerId, actionId } = req.body;
	if (!playerId || !actionId) {
		return res.status(400).json({ error: 'playerId and actionId required' });
	}
	try {
		const result = MultiplayerServerManager.getInstance().handleAction(playerId, actionId);
		res.json({ success: result });
	} catch (e) {
		res.status(500).json({ error: e instanceof Error ? e.message : 'Error processing action' });
	}
});

app.listen(port, () => {
	console.log(`Server listening on port ${port}`);
});
