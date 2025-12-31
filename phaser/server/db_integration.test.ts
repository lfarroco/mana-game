/**
 * @jest-environment node
 */
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
			stdio: 'inherit' // Uncomment for debug
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

		if (!response.ok) {
			console.error('Connect failed:', await response.text());
		}
		const data = await response.json();
		console.log('Connect response:', data);
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

	it('should complete a full round (3 steps) and save ghost', async () => {
		// Step 1: Encounter
		let response = await fetch(`${SERVER_URL}/multiplayer/state?playerId=${PLAYER_ID}`);
		let data = await response.json();
		expect(data.phase).toBe('encounter');

		// Action 1 -> Advance to Step 2 (Shop)
		await fetch(`${SERVER_URL}/multiplayer/action`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ playerId: PLAYER_ID, actionId: 'upgrade_unit_1' })
		});

		// Step 2: Shop
		response = await fetch(`${SERVER_URL}/multiplayer/state?playerId=${PLAYER_ID}`);
		data = await response.json();
		expect(data.phase).toBe('shop');

		// Action 2 -> Advance to Step 3 (Encounter)
		await fetch(`${SERVER_URL}/multiplayer/action`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ playerId: PLAYER_ID, actionId: 'card:archer' })
		});

		// Step 3: Encounter
		response = await fetch(`${SERVER_URL}/multiplayer/state?playerId=${PLAYER_ID}`);
		data = await response.json();
		expect(data.phase).toBe('encounter');

		// Action 3 -> Advance to Combat (Pass Team)
		const teamPayload = { units: [{ id: 'hero_1' }] };
		await fetch(`${SERVER_URL}/multiplayer/action`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ playerId: PLAYER_ID, actionId: 'ready_combat', payload: { team: teamPayload } })
		});

		// Verify Combat Phase
		response = await fetch(`${SERVER_URL}/multiplayer/state?playerId=${PLAYER_ID}`);
		data = await response.json();
		expect(data.phase).toBe('combat');

		// Verify in DB
		const dbRes = await pool.query('SELECT * FROM player_sessions WHERE player_id = $1', [PLAYER_ID]);
		expect(dbRes.rows[0].phase).toBe('combat');

		// Verify Ghost Saved
		const ghostRes = await pool.query('SELECT * FROM ghosts WHERE player_id = $1 AND round = 1', [PLAYER_ID]);
		expect(ghostRes.rows.length).toBe(1);
		expect(ghostRes.rows[0].team_composition).toEqual(teamPayload);
	});

	it('should advance to next round after combat', async () => {
		await fetch(`${SERVER_URL}/multiplayer/action`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ playerId: PLAYER_ID, actionId: 'combat_done' })
		});

		const response = await fetch(`${SERVER_URL}/multiplayer/state?playerId=${PLAYER_ID}`);
		const data = await response.json();

		expect(data.phase).toBe('encounter');

		const dbRes = await pool.query('SELECT * FROM player_sessions WHERE player_id = $1', [PLAYER_ID]);
		expect(dbRes.rows[0].round).toBe(2);
		expect(dbRes.rows[0].step).toBe(1);
	});
});
