import { spawn } from 'child_process';
import { Pool } from 'pg';

// Test configuration
const PORT = 3000;
const SERVER_URL = `http://localhost:${PORT}`;
const PLAYER_ID = "integration_test_player";

// DB Config
const pool = new Pool({
	user: 'postgres',
	host: 'localhost',
	database: 'mana_battle',
	password: 'password',
	port: 5432,
});

describe('E2E Server Integration (Database)', () => {
	let serverProcess: any;

	beforeAll(async () => {
		// Start server
		// Assuming we build it with tsx or similar, or just run it.
		// For integration test in this env, we might assume the server is NOT running, so we start it.
		// OR we just import app and run it? Importing app is better if exported.
		// But server/index.ts starts listening on import currently. 
		// Let's spawn it to be "E2E".

		console.log("Starting server...");
		serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
			detached: false,
			// stdio: 'inherit' // Uncomment for debug
		});

		// Wait for server to be ready
		await new Promise<void>((resolve) => {
			const check = setInterval(async () => {
				try {
					const res = await fetch(`${SERVER_URL}/test-combat`);
					if (res.ok) {
						clearInterval(check);
						resolve();
					}
				} catch (e) { }
			}, 500);
		});
		console.log("Server is up.");
	}, 10000);

	afterAll(() => {
		if (serverProcess) {
			serverProcess.kill();
		}
		pool.end();
	});

	it('should connect and create a session in the database', async () => {
		const response = await fetch(`${SERVER_URL}/multiplayer/connect`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ playerId: PLAYER_ID })
		});

		const data = await response.json();
		expect(response.ok).toBe(true);
		expect(data.success).toBe(true);
		expect(data.session).toBeDefined();
		expect(data.session.player_id).toBe(PLAYER_ID);
		expect(data.session.phase).toBe('encounter');

		// Verify in DB
		const dbRes = await pool.query('SELECT * FROM player_sessions WHERE player_id = $1', [PLAYER_ID]);
		expect(dbRes.rows.length).toBe(1);
		expect(dbRes.rows[0].phase).toBe('encounter');
	});

	it('should retrieve state from database', async () => {
		const response = await fetch(`${SERVER_URL}/multiplayer/state?playerId=${PLAYER_ID}`);
		const data = await response.json();

		expect(response.ok).toBe(true);
		expect(data.phase).toBe('encounter');
		expect(data.options).toHaveLength(3); // Mock encounter options
	});

	it('should perform action and update database state', async () => {
		const actionResponse = await fetch(`${SERVER_URL}/multiplayer/action`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ playerId: PLAYER_ID, actionId: 'upgrade_unit' })
		});

		expect(actionResponse.ok).toBe(true);

		// Check state - should have advanced to Shop
		const response = await fetch(`${SERVER_URL}/multiplayer/state?playerId=${PLAYER_ID}`);
		const data = await response.json();

		expect(data.phase).toBe('shop');

		// Verify in DB
		const dbRes = await pool.query('SELECT * FROM player_sessions WHERE player_id = $1', [PLAYER_ID]);
		expect(dbRes.rows[0].phase).toBe('shop');
	});
});
