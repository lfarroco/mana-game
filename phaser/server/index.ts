import 'dotenv/config';
import './mocks';
import express from 'express';
import { runServerSideCombat } from '../src/Scenes/Battleground/serverCombatDemo.js';
import { MultiplayerServerManager } from './MultiplayerServerManager.js';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = 3000;

// Supabase Configuration
const supabaseUrl = 'https://bsorlueqmikmixlcryiq.supabase.co';
const supabaseKey = 'sb_publishable_75wmGG1tt_gr8aGscan7PQ_kH07-3E1';
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware to extract and verify Supabase Token
const authenticate = async (req: any, res: any, next: any) => {
	const authHeader = req.headers.authorization;
	if (!authHeader) {
		return res.status(401).json({ error: 'Missing Authorization Header' });
	}

	const token = authHeader.split(' ')[1];
	if (!token) {
		return res.status(401).json({ error: 'Invalid Token Format' });
	}

	try {
		const { data: { user }, error } = await supabase.auth.getUser(token);
		if (error || !user) {
			console.error("Auth Fail:", error);
			return res.status(401).json({ error: 'Invalid or Expired Token' });
		}

		req.user = user;

		// Ensure player profile exists in our DB (Lazy Profile Creation)
		// We do this here or rely on specific endpoints? 
		// Doing it here ensures every request has a valid DB profile.
		// It adds DB overhead to every request, but ensures consistency.
		// Optimization: Cache this check? For now, simple approach.
		// Actually, let's delegate profile creation to 'ensureProfile' method in Manager.

		next();
	} catch (e) {
		console.error("Auth Error:", e);
		res.status(500).json({ error: 'Authentication Error' });
	}
};

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
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
	if (req.method === 'OPTIONS') {
		res.sendStatus(200);
	} else {
		next();
	}
});

app.use(express.json());

// Protected Multiplayer Endpoints
app.post('/multiplayer/connect', authenticate, async (req: any, res) => {
	// Ignore body.playerId, use authenticated user id
	const playerId = req.user.id;
	const { selectedCrystalId } = req.body;

	// Ensure profile exists (First time login handling)
	try {
		// Create or Get Profile
		await MultiplayerServerManager.getInstance().ensureProfile(playerId, req.user.email);
	} catch (e) {
		console.error("Profile Ensure Fail", e);
	}

	try {
		const session = await MultiplayerServerManager.getInstance().createSession(playerId, selectedCrystalId);
		res.json({ success: true, session });
	} catch (e) {
		console.error("Connect Error:", e);
		res.status(500).json({ error: 'Database error', details: e instanceof Error ? e.message : String(e) });
	}
});

app.get('/multiplayer/state', authenticate, async (req: any, res) => {
	const playerId = req.user.id;
	try {
		const options = await MultiplayerServerManager.getInstance().getPhaseOptions(playerId);
		res.json(options);
	} catch (e) {
		res.status(404).json({ error: e instanceof Error ? e.message : 'Error fetching state' });
	}
});

app.post('/multiplayer/action', authenticate, async (req: any, res) => {
	const playerId = req.user.id;
	const { actionId, ...payload } = req.body;

	if (!actionId) {
		return res.status(400).json({ error: 'actionId required' });
	}
	try {
		const result = await MultiplayerServerManager.getInstance().handleAction(playerId, actionId, payload);
		res.json({ success: result });
	} catch (e) {
		res.status(500).json({ error: e instanceof Error ? e.message : 'Error processing action' });
	}
});

// Public Endpoint (Profile View)
app.get('/player/:id', async (req, res) => {
	// If the requesting user is authenticated, we could return more info?
	// For now, public profile is fine.
	try {
		const profile = await MultiplayerServerManager.getInstance().getPlayerProfile(req.params.id);
		res.json(profile);
	} catch (e) {
		// If profile not found, maybe they are a new user who hasn't connected yet?
		// Return 404.
		res.status(404).json({ error: 'Player not found' });
	}
});

app.listen(port, () => {
	console.log("SERVER V2 STARTED");
	console.log(`Server listening on port ${port}`);
});
