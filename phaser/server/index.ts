import './mocks';
import express from 'express';
import { runServerSideCombat } from '../src/Scenes/Battleground/serverCombatDemo.js';
import { MultiplayerServerManager } from './MultiplayerServerManager.js';

const app = express();
const port = 3000;

app.get('/test-combat', (_req, res) => {
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


app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
	if (req.method === 'OPTIONS') {
		res.sendStatus(200);
	} else {
		next();
	}
});

app.use(express.json());

// Simple in-memory session mapping for demo purposes
// In production, use proper session middleware
app.post('/multiplayer/connect', async (req, res) => {
	const { playerId } = req.body;
	if (!playerId) {
		return res.status(400).json({ error: 'playerId required' });
	}
	try {
		const session = await MultiplayerServerManager.getInstance().createSession(playerId);
		res.json({ success: true, session });
	} catch (e) {
		console.error("Connect Error:", e);
		res.status(500).json({ error: 'Database error', details: e instanceof Error ? e.message : String(e) });
	}
});

app.get('/multiplayer/state', async (req, res) => {
	const { playerId } = req.query;
	if (!playerId || typeof playerId !== 'string') {
		return res.status(400).json({ error: 'playerId required' });
	}
	try {
		const options = await MultiplayerServerManager.getInstance().getPhaseOptions(playerId);
		res.json(options);
	} catch (e) {
		res.status(404).json({ error: e instanceof Error ? e.message : 'Error fetching state' });
	}
});

app.post('/multiplayer/action', async (req, res) => {
	const { playerId, actionId, ...payload } = req.body;
	if (!playerId || !actionId) {
		return res.status(400).json({ error: 'playerId and actionId required' });
	}
	try {
		const result = await MultiplayerServerManager.getInstance().handleAction(playerId, actionId, payload);
		res.json({ success: result });
	} catch (e) {
		res.status(500).json({ error: e instanceof Error ? e.message : 'Error processing action' });
	}
});

app.listen(port, () => {
	console.log("SERVER V2 STARTED");
	console.log(`Server listening on port ${port}`);
});
