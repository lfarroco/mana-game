// We might need to import logical counterparts or move shared logic to a shared folder.
// For now, I'll mock the data generation or reuse what I can.
// Note: Imports from "src" might be tricky if they depend on Phaser or browser-specifics.
// existing serverCombatDemo uses imports from src, so it seems like we successfully compile/run src code in node.


import { PhaseOptions } from "../src/Multiplayer/MultiplayerTypes";
import { Pool } from 'pg';
import * as Card from "../src/Models/Entities/Card";
import * as BoardLogic from "../src/Models/BoardLogic";
import { registerCollection } from "../src/Models/Entities/Card";
import { pickRandom } from "../src/utils";

import { generateEnemyTeam } from "../src/Scenes/Battleground/generateEnemyTeam";
import { runCombat } from "../src/Scenes/Battleground/RunCombatCore";
import { createServerCombatEffects } from "../src/Scenes/Battleground/ServerCombatEffects";
import { FORCE_ID_PLAYER, FORCE_ID_CPU } from "../src/Scenes/Battleground/ServerConstants";
import { makeForce } from "../src/Models/Entities/Force";
import { BASE_COLLECTION_DATA } from "../src/Data/BaseCollection";
import { State } from "../src/Models/State";
import { Unit, makeUnit } from "../src/Models/Entities/Unit";

// Register base collection to ensure unit definitions exist
registerCollection(BASE_COLLECTION_DATA);

// Database configuration
// In production, use environment variables
const pool = new Pool({
	user: 'postgres',
	host: 'localhost',
	database: 'mana_battle',
	password: 'password',
	port: 5432,
});

const ENCOUNTER_IDS = [
	'upgrade_unit',
	'armory',
	'healing_tent',
	'frontier_fort',
	'forest_pools',
	'toxic_chamber',
	'trial_circuit',
	'trappers_guild',
	'thunder_spire',
	'commanders_tent',
	'assassins_hideout',
	'power_distributor',
	'power_absorber',
	'silver_shop',
	'gold_shop'
];

interface PlayerSession {
	id: string; // This is the session UUID
	player_id: string;
	phase: string;
	round: number;
	step: number;
	seed: string;
	initial_seed: string;
	action_log: any[];
	current_options?: any[];
	wins: number;
	losses: number;
	team?: any;
}

export class MultiplayerServerManager {
	private static instance: MultiplayerServerManager;

	private constructor() { }

	public static getInstance(): MultiplayerServerManager {
		if (!MultiplayerServerManager.instance) {
			MultiplayerServerManager.instance = new MultiplayerServerManager();
		}
		return MultiplayerServerManager.instance;
	}

	// Since we are now async, we update signatures
	public async createSession(playerId: string, selectedCrystalId?: string): Promise<PlayerSession> {
		// Ensure team column exists (migration-like step)
		try {
			await pool.query('ALTER TABLE player_sessions ADD COLUMN IF NOT EXISTS team jsonb');
		} catch (e) {
			console.error("Error adding team column", e);
		}

		// Initial Team Setup
		let initialTeam: any = null;
		if (selectedCrystalId) {
			const coreUnit = makeUnit(FORCE_ID_PLAYER, selectedCrystalId, { x: 1, y: 1 });
			initialTeam = { units: [coreUnit] };
		}

		// Generate a random seed
		const seed = Math.random().toString(36).substring(7);

		// Upsert session
		const query = `
            INSERT INTO player_sessions (player_id, phase, round, step, seed, initial_seed, current_options, action_log, wins, losses, team)
            VALUES ($1, 'encounter', 1, 1, $2, $2, null, '[]'::jsonb, 0, 0, $3)
            ON CONFLICT (player_id) 
            DO UPDATE SET phase = 'encounter', round = 1, step = 1, seed = EXCLUDED.seed, initial_seed = EXCLUDED.initial_seed, current_options = null, action_log = '[]'::jsonb, wins = 0, losses = 0, team = EXCLUDED.team, updated_at = now()
            RETURNING *;
        `;
		const res = await pool.query(query, [playerId, seed, initialTeam ? JSON.stringify(initialTeam) : null]);
		console.log(`Created/Updated session for ${playerId} with seed ${seed} and crystal ${selectedCrystalId}`);
		return res.rows[0];
	}

	public async getSession(playerId: string): Promise<PlayerSession | undefined> {
		const query = 'SELECT * FROM player_sessions WHERE player_id = $1';
		const res = await pool.query(query, [playerId]);
		return res.rows[0];
	}

	public async getPhaseOptions(playerId: string): Promise<PhaseOptions> {
		const session = await this.getSession(playerId);
		if (!session) {
			throw new Error("Session not found");
		}

		console.log(`Getting options for ${playerId} in phase ${session.phase} (Round ${session.round}, Step ${session.step})`);

		// If stored options exist, return them (idempotency)
		if (session.current_options) {
			const stored = session.current_options as any;
			if (!Array.isArray(stored) && stored.options) {
				return {
					phase: session.phase as any,
					options: stored.options,
					combatState: stored.combatState
				};
			}
			return {
				phase: session.phase as any,
				options: session.current_options,
				team: session.team,
				wins: session.wins,
				losses: session.losses,
			};
		}

		let newOptions: any[] = [];
		let response: PhaseOptions = {
			phase: session.phase as any,
			options: [],
			team: session.team,
			wins: session.wins,
			losses: session.losses,
		};

		// Pseudo-random generation based on seed + round + step


		switch (session.phase) {
			case "encounter":
				// Mock deterministic options using stepSeed
				/*
				newOptions = [
					{ id: `upgrade_unit` },
					{ id: `armory` },
					{ id: `healing_tent` }
				];
				*/
				const seedNum = this.stringToSeed(session.seed);
				const shuffled = [...ENCOUNTER_IDS];
				let currentSeedVal = seedNum;

				// Fisher-Yates Shuffle with seeded random
				for (let i = shuffled.length - 1; i > 0; i--) {
					const x = Math.sin(currentSeedVal++) * 10000;
					const rnd = x - Math.floor(x);
					const j = Math.floor(rnd * (i + 1));
					[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
				}

				newOptions = shuffled.slice(0, 3).map(id => ({ id }));
				response.options = newOptions;
				break;

			case "shop":
				const previousStep = session.step - 1;
				const lastEncounterAction = session.action_log.find((a: any) => a.round === session.round && a.step === previousStep);
				const encounterId = lastEncounterAction ? lastEncounterAction.actionId : null;

				let filterType = "";
				// Map encounter ID to effect type filter
				// Matches client-side Encounter.ts logic
				if (encounterId) {
					if (encounterId === 'armory') filterType = 'damage';
					else if (encounterId === 'healing_tent') filterType = 'heal';
					else if (encounterId === 'frontier_fort') filterType = 'shield';
					else if (encounterId === 'forest_pools') filterType = 'regen';
					else if (encounterId === 'toxic_chamber') filterType = 'poison';
					else if (encounterId === 'trial_circuit') filterType = 'haste';
					else if (encounterId === 'trappers_guild') filterType = 'slow';
					else if (encounterId === 'thunder_spire') filterType = 'charge';
					else if (encounterId === 'commanders_tent') filterType = 'increase_power';
					else if (encounterId === 'assassins_hideout') filterType = 'increase_critical';
					else if (encounterId === 'silver_shop') filterType = 'silver';
					else if (encounterId === 'gold_shop') filterType = 'gold';
				}

				const allCards = Card.getAvailableCards();
				let filteredCards = allCards;

				if (filterType) {
					if (filterType === 'silver') {
						filteredCards = allCards.filter(card => card.rank === 2);
					} else if (filterType === 'gold') {
						filteredCards = allCards.filter(card => card.rank === 3);
					} else {
						filteredCards = allCards.filter(card =>
						(card.effects?.some(eff => eff.id === filterType) ||
							card.reactions?.some(react => react.effects?.some(eff => eff.id === filterType)))
						);
					}
				}

				// Fallback if filter returns empty (shouldn't happen with full collection but safe to have)
				if (filteredCards.length === 0) {
					filteredCards = allCards;
				}

				newOptions = pickRandom(filteredCards, 3).map(card => ({
					id: card.id,
					cost: 10 // Mock cost for now, logic can be added later
				}));

				response.options = newOptions;
				break;

			case "combat":
				console.log("[getPhaseOptions] Generating Combat...");
				const simResult = this.simulateCombat(session);

				newOptions = [{ id: 'combat_done', label: "Continue" }];

				// Encode Combat State for Client
				console.log("[getPhaseOptions] Constructing response...");

				response.options = newOptions;
				response.combatState = {
					// Send all units (Player + CPU) so client uses the exact IDs (including injected Core)
					// Use the INITIAL units (cloned before simulation) so client starts at frame 0 state
					units: simResult.initialUnits,
					enemyTeam: simResult.initialUnits.filter((u: any) => u.force === FORCE_ID_CPU),
					logs: simResult.logs,
					seed: session.seed
				};
				console.log("[getPhaseOptions] Response constructed.");
				break;

			case "victory":
				newOptions = [{ id: "menu:main_menu", label: "Victory! Return to Menu" }];
				response.options = newOptions;
				break;

			case "game_over":
				newOptions = [{ id: "menu:main_menu", label: "Defeat. Return to Menu" }];
				response.options = newOptions;
				break;

			case "orb_shop":
				response.options = [{ id: 'upgrade_orb' }];
				break;

			default:
				break;
		}

		// Update DB with generated options
		const optionsToStore = response.combatState ? { options: response.options, combatState: response.combatState } : response.options;
		await pool.query('UPDATE player_sessions SET current_options = $1 WHERE player_id = $2', [JSON.stringify(optionsToStore), playerId]);

		return response;
	}

	// Helper to resolve the semantic effect of an action (e.g. buying a unit, getting a buff)
	private async resolveAction(session: PlayerSession, actionId: string, payload?: any) {
		// 1. Check if actionId is a Card ID (Shop Purchase)
		const availableCards = Card.getAvailableCards();
		const card = availableCards.find(c => c.id === actionId);

		let team = session.team || { units: [] };
		let units = team.units || [];

		// Ensure Core
		if (units.length === 0) {
			// First time setup if empty? Usually handled in createCombatState but good to have.
		}

		if (card) {
			// SHOP PURCHASE LOGIC
			console.log(`[resolveAction] Player ${session.player_id} buying unit ${actionId}`);

			// Check if we have an existing unit of this type to upgrade
			const existingUnitIndex = units.findIndex((u: any) => u.cardId === actionId);
			if (existingUnitIndex >= 0) {
				const existingUnit = units[existingUnitIndex];
				if (existingUnit.rank < 3) {
					// Upgrade!
					existingUnit.rank++;
					// Boost stats? Usually re-generate or valid logic.
					// Simple Mock Upgrade:
					existingUnit.maxLife = Math.floor(existingUnit.maxLife * 1.5);
					existingUnit.life = existingUnit.maxLife;
					existingUnit.power = Math.floor(existingUnit.power * 1.5);
					console.log(`[resolveAction] Upgraded unit ${actionId} to rank ${existingUnit.rank}`);
				}
			} else {
				// New Unit
				if (units.length < 9) { // Max party size constant hardcoded for now
					// Find free slot
					const targetPos = BoardLogic.getEmptySlot(units, FORCE_ID_PLAYER);

					if (targetPos) {
						const newUnit = makeUnit(FORCE_ID_PLAYER, actionId, targetPos);

						// CHECK FOR SILVER/GOLD SHOP CONTEXT
						const previousStep = session.step - 1;
						const lastEncounterAction = session.action_log.find((a: any) => a.round === session.round && a.step === previousStep);
						const encounterId = lastEncounterAction ? lastEncounterAction.actionId : null;
						let targetRank = 1;
						if (encounterId === 'silver_shop') targetRank = 2;
						if (encounterId === 'gold_shop') targetRank = 3;

						// Handle Silver/Gold Shop Rank Up
						if (targetRank > 1) {
							newUnit.rank = targetRank;
							// Apply upgrades (Rank 2 = 1 upgrade, Rank 3 = 2 upgrades)
							const extraLevels = targetRank - 1;
							for (let i = 0; i < extraLevels; i++) {
								newUnit.maxLife = Math.floor(newUnit.maxLife * 1.5);
								newUnit.life = newUnit.maxLife;
								newUnit.power = Math.floor(newUnit.power * 1.5);
							}
							console.log(`[resolveAction] Recruited unit ${actionId} at Rank ${newUnit.rank} (Silver/Gold Shop)`);
						}

						units.push(newUnit);
						console.log(`[resolveAction] Added new unit ${actionId} at ${targetPos.x},${targetPos.y}`);
					} else {
						console.warn(`[resolveAction] failed to find a slot for ${actionId}`);
					}
				}
			}
		} else {
			// ENCOUNTER / BUFF LOGIC
			// Check for known encounter IDs
			if (actionId === 'upgrade_unit') {
				// handled via sub-menu usually? Or payload?
			}
			// Mapping from Encounter ID to Effect
			// armory -> damage
			// healing_tent -> heal (full heal?)
			// ...
			if (actionId.startsWith('improve_')) {
				const type = actionId.replace('improve_', '');
				console.log(`[resolveAction] Applying buff ${type} to all units? Or specific?`);
			}


			if (actionId === 'apply_orb' && payload) {
				const { orbId, targetUnitId } = payload;
				console.log(`[resolveAction] Applying orb ${orbId} to ${targetUnitId}`);
				const targetUnit = units.find((u: any) => u.id === targetUnitId);
				if (targetUnit) {
					if (payload.orbId === 'upgrade_orb') {
						// TOOD: should be the logic used by the upgrade unit function
						targetUnit.rank = (targetUnit.rank || 1) + 1;
						// Apply stats boost (mock)
						targetUnit.maxLife = Math.floor(targetUnit.maxLife * 1.5);
						targetUnit.life = targetUnit.maxLife;
						targetUnit.power = Math.floor(targetUnit.power * 1.5);
						console.log(`[resolveAction] Upgraded unit ${targetUnit.id} to rank ${targetUnit.rank}`);
					} else if (payload.orbId === 'absorb_power_orb') {
						let totalAbsorbed = 0;
						// Find row neighbors
						units.forEach((u: any) => {
							if (u.id !== targetUnit.id && u.position && u.position.y === targetUnit.position.y) {
								const absorbed = Math.floor(u.power * 0.25);
								if (absorbed > 0) {
									u.power = Math.max(0, u.power - absorbed);
									totalAbsorbed += absorbed;
									console.log(`[resolveAction] Unit ${u.id} drained ${absorbed} power`);
								}
							}
						});

						if (totalAbsorbed > 0) {
							targetUnit.power = (targetUnit.power || 0) + totalAbsorbed;
							targetUnit.bonusPower = (targetUnit.bonusPower || 0) + totalAbsorbed;
							console.log(`[resolveAction] Target ${targetUnit.id} absorbed ${totalAbsorbed} power`);
						}
					} else if (payload.orbId === 'distribute_power_orb') {
						const powerToDistribute = Math.floor(targetUnit.power * 0.5);
						if (powerToDistribute > 0) {
							// Deduct from source
							targetUnit.power = Math.max(0, targetUnit.power - powerToDistribute);
							const bonusToLose = Math.max(0, Math.min(targetUnit.bonusPower || 0, powerToDistribute));
							targetUnit.bonusPower = (targetUnit.bonusPower || 0) - bonusToLose;
							console.log(`[resolveAction] Source ${targetUnit.id} distributed ${powerToDistribute} power`);

							// Find targets (row allies excluding self)
							const targets = units.filter((u: any) => u.id !== targetUnit.id && u.position && u.position.y === targetUnit.position.y);

							if (targets.length > 0) {
								const powerPerTarget = Math.floor(powerToDistribute / targets.length);
								targets.forEach((u: any) => {
									u.power = (u.power || 0) + powerPerTarget;
									u.bonusPower = (u.bonusPower || 0) + powerPerTarget;
									console.log(`[resolveAction] Distributed ${powerPerTarget} power to ${u.id}`);
								});
							}
						}
					}
				}
			}
		}

		team.units = units;
		await pool.query('UPDATE player_sessions SET team = $1, updated_at = now() WHERE id = $2',
			[JSON.stringify(team), session.id]);

		return true;
	}

	public async handleAction(playerId: string, actionId: string, payload?: any): Promise<boolean> {
		const session = await this.getSession(playerId);
		if (!session) {
			throw new Error("Session not found");
		}

		console.log(`Player ${playerId} selected ${actionId} in Step ${session.step} with payload:`, JSON.stringify(payload));

		// Handle State Update Actions (Non-Progression)
		if (actionId === 'update_team') {
			if (payload && payload.team) {
				const sessionTeam = session.team || { units: [] };
				const clientUnits = payload.team.units || [];

				const serverUnits = sessionTeam.units || [];
				serverUnits.forEach((su: any) => {
					const cu = clientUnits.find((u: any) => u.id === su.id || (u.cardId === su.cardId && u.id === su.id)); // ID matching
					if (cu && cu.position) {
						su.position = cu.position;
					}
				});

				await pool.query('UPDATE player_sessions SET team = $1, updated_at = now() WHERE id = $2',
					[JSON.stringify({ units: serverUnits }), session.id]);
				console.log(`Team positions updated for Player ${playerId}`);
			}
			return true; // Success, no phase change
		}

		if (actionId === 'discard_unit') {
			if (payload && payload.unitId) {
				const sessionTeam = session.team || { units: [] };
				const serverUnits = sessionTeam.units || [];
				const initialLength = serverUnits.length;

				const filteredUnits = serverUnits.filter((u: any) => u.id !== payload.unitId);

				if (filteredUnits.length !== initialLength) {
					await pool.query('UPDATE player_sessions SET team = $1, updated_at = now() WHERE id = $2',
						[JSON.stringify({ units: filteredUnits }), session.id]);
					console.log(`Unit ${payload.unitId} discarded for Player ${playerId}`);
				} else {
					console.warn(`Discard failed: Unit ${payload.unitId} not found in session for Player ${playerId}`);
				}
			}
			return true; // Success, no phase change
		}

		const existingAction = session.action_log.find((entry: any) =>
			entry.round === session.round &&
			entry.phase === session.phase &&
			entry.step === session.step
		);

		if (existingAction) {
			console.warn(`Duplicate action detected for Player ${playerId} in Step ${session.step}. Ignoring.`);
			return true; // Return success to client so it doesn't retry
		}

		// Validate Action against allowed Options
		// We allow 'combat_done' implicitly if phase is combat? 
		// No, we added it to options.
		// We skip validation if current_options is null but allow it?
		// No, if options are null, client shouldn't be acting.

		if (session.current_options) {
			let currentOptions = session.current_options as any;
			if (!Array.isArray(currentOptions) && currentOptions.options) {
				currentOptions = currentOptions.options;
			}

			const validOption = currentOptions.find((opt: any) => opt.id === actionId);
			// Allow 'apply_orb' action implicitly if we are in 'orb_shop' phase
			const isImplicitAction = (session.phase === 'orb_shop' && actionId === 'apply_orb') ||
				(session.phase === 'shop' && actionId === 'shop_skip');


			if (!validOption && !isImplicitAction) {
				console.warn(`Action ${actionId} rejected: Invalid option for Player ${playerId} (Phase: ${session.phase})`);
				return false;
			}

			if (validOption && validOption.id === 'upgrade_unit') {
				const newOptions = [{ id: 'upgrade_orb' }];
				await pool.query('UPDATE player_sessions SET step = step + 1, phase = $1, current_options = $2, updated_at = now() WHERE id = $3',
					['orb_shop', JSON.stringify({ options: newOptions }), session.id]);

				session.phase = 'orb_shop';
				session.step++;
				session.current_options = { options: newOptions } as any;

				return true;
			} else if (validOption && validOption.id === 'power_absorber') {
				const newOptions = [{ id: 'absorb_power_orb' }];
				await pool.query('UPDATE player_sessions SET step = step + 1, phase = $1, current_options = $2, updated_at = now() WHERE id = $3',
					['orb_shop', JSON.stringify({ options: newOptions }), session.id]);

				session.phase = 'orb_shop';
				session.step++;
				session.current_options = { options: newOptions } as any;

				return true;
			} else if (validOption && validOption.id === 'power_distributor') {
				const newOptions = [{ id: 'distribute_power_orb' }];
				await pool.query('UPDATE player_sessions SET step = step + 1, phase = $1, current_options = $2, updated_at = now() WHERE id = $3',
					['orb_shop', JSON.stringify({ options: newOptions }), session.id]);

				session.phase = 'orb_shop';
				session.step++;
				session.current_options = { options: newOptions } as any;

				return true;
			}
		} else {
			// No options generated yet? or cleared.
			// Reject action.
			console.warn(`Action ${actionId} rejected: No active options for Player ${playerId}`);
			return false;
		}

		// SERVER AUTHORITATIVE ACTION RESOLUTION
		await this.resolveAction(session, actionId, payload);

		// Append action to log
		const actionEntry = {
			round: session.round,
			phase: session.phase,
			step: session.step,
			actionId: actionId,
			payload: payload
		};

		// We need to persist the log. Since we do updates below, we can combine or emit separate.
		// For simplicity, let's just append to the array in DB using specific postgres JSONB ops.
		await pool.query('UPDATE player_sessions SET action_log = action_log || $1::jsonb WHERE id = $2',
			[JSON.stringify([actionEntry]), session.id]);

		if (session.phase === "combat") {
			// End of combat, advancing to next round
			// We need to determine if we won or lost the combat.
			// Ideally this comes from the verify/simulate combat logic.
			// For now, we will assume a mock WIN if actionId contains 'win' or 50/50 if not specified
			// In reality, actionId here is the "combat_result" generic action, payload might have details?
			// But for strict server auth, we should simulate.

			// MOCK COMBAT RESULT:
			// Run Simulation to determine win/loss and get final stats
			const simResult = this.simulateCombat(session);
			const playerUnits = simResult.finalState.gameData.player.units; // These are post-combat units
			const core = playerUnits.find(u => u.isCore);
			const wonCombat = core && core.life > 0;

			// Update Permanent Stats (Power Gains)
			// We need to map back to the session team.
			// session.team.units are the "source of truth".
			// simResult.finalState units are the simulation result.
			// We iterate session.team.units and update bonusPower if found in finalState.
			const sessionTeam = session.team || { units: [] };
			if (sessionTeam.units) {
				sessionTeam.units.forEach((u: any) => {
					// matching by id. Note that combat simulation might inject ID if missing, but session units have IDs.
					const simUnit = playerUnits.find(su => su.id === u.id);
					if (simUnit) {
						// Update bonusPower
						// We must also update 'power' because in this game 'power' is the effective value.
						// The simulation unit has the correct final power (base + permanent changes).
						u.bonusPower = simUnit.bonusPower;
						u.power = simUnit.power;

						// Also sync maxLife if changed (e.g. upgrades)? 
						// Upgrades happen in Shop, but if reactions change maxLife permanently, we should sync it.
						// Currently increasePower is the main permanent one.
						u.maxLife = simUnit.maxLife;
					}
				});

				// Persist Updated Team
				await pool.query('UPDATE player_sessions SET team = $1 WHERE id = $2',
					[JSON.stringify(sessionTeam), session.id]);
			}

			// const wonCombat = Math.random() > 0.5; // TODO: Replace with actual simulation
			// Replaced above.

			const newSeed = this.generateNextSeed(session.seed, actionId);
			await this.advancePhase(session, newSeed, wonCombat || false);
			return true;
		}

		// Handle Encounter/Shop progression
		// Sequence: 
		// Step 1: Encounter Choice -> Step 2: Shop (Resolution)
		// Step 3: Encounter Choice -> Step 4: Shop (Resolution)
		// Step 5: Encounter Choice -> Step 6: Shop (Resolution)
		// Step 6 -> Combat

		if (session.step < 6) {
			// Stay in encounter/shop (or toggle)
			let nextPhase = "encounter";
			let nextOptions: any = null;

			// Odd Steps (1, 3, 5) Encounter -> Shop
			if (session.step % 2 !== 0) {
				if (actionId === 'upgrade_unit' || actionId === 'power_distributor' || actionId === 'power_absorber') {
					nextPhase = "orb_shop";
					if (actionId === 'upgrade_unit') nextOptions = [{ id: 'upgrade_orb' }];
					if (actionId === 'power_distributor') nextOptions = [{ id: 'distribute_power_orb' }];
					if (actionId === 'power_absorber') nextOptions = [{ id: 'absorb_power_orb' }];
				} else {
					nextPhase = "shop";
				}
			} else {
				// Even Steps (2, 4) Shop -> Encounter
				nextPhase = "encounter";
			}

			// Update Seed: deterministic based on current seed + actionId
			const newSeed = this.generateNextSeed(session.seed, actionId);

			if (nextOptions) {
				await pool.query('UPDATE player_sessions SET step = step + 1, phase = $1, seed = $2, current_options = $3, updated_at = now() WHERE id = $4',
					[nextPhase, newSeed, JSON.stringify({ options: nextOptions }), session.id]);
			} else {
				await pool.query('UPDATE player_sessions SET step = step + 1, phase = $1, seed = $2, current_options = null, updated_at = now() WHERE id = $3',
					[nextPhase, newSeed, session.id]);
			}
		} else {
			// After Step 6, go to Combat
			// Save Ghost if team provided
			if (payload && payload.team) {
				await this.saveGhost(session.player_id, session.round, payload.team);
			}

			// New seed for combat? Or keep same? Usually keep same or update.
			// Let's update it to keep the chain moving.
			const newSeed = this.generateNextSeed(session.seed, actionId);

			// Generate Combat Result (or prepare for it)
			// For now, just transition phase
			await pool.query('UPDATE player_sessions SET phase = $1, seed = $2, current_options = null, updated_at = now() WHERE id = $3', ['combat', newSeed, session.id]);
		}

		return true;
	}

	private simulateCombat(session: PlayerSession): { finalState: State, initialUnits: Unit[], logs: any[] } {
		const combatState = this.createCombatState(session);
		// CLONE units for the response so we send the INITIAL state, not the post-simulation state
		const initialUnits = JSON.parse(JSON.stringify(combatState.battleData.units));

		const effects = createServerCombatEffects(combatState);
		const combatRunner = runCombat(combatState, effects);

		const SIM_DELTA = 16.67;
		let frame = 0;
		const MAX_FRAMES = 10000; // Safety
		while (combatRunner.isActive() && frame < MAX_FRAMES) {
			effects.setFrame(frame);
			combatRunner.updateFrame(combatState, frame * SIM_DELTA, SIM_DELTA);
			frame++;
		}

		return { finalState: combatState, initialUnits, logs: effects.logs };
	}

	private generateNextSeed(currentSeed: string, actionId: string): string {
		// Simple hash: rotate and mix chars
		const input = currentSeed + actionId;
		let hash = 0;
		for (let i = 0; i < input.length; i++) {
			const char = input.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return Math.abs(hash).toString(36);
	}

	private stringToSeed(str: string): number {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash;
		}
		return Math.abs(hash);
	}

	private async saveGhost(playerId: string, round: number, team: any) {
		// Save to ghosts table
		const query = `
            INSERT INTO ghosts (player_id, round, team_composition)
            VALUES ($1, $2, $3)
        `;
		await pool.query(query, [playerId, round, JSON.stringify(team)]);
		console.log(`Saved ghost for ${playerId} Round ${round}`);
	}

	private createCombatState(session: PlayerSession): State {
		// print session team debug info
		console.log(`[createCombatState] Session Team Raw:`, JSON.stringify(session.team));

		// parsing the team
		let playerUnits: Unit[] = [];
		if (session.team && (session.team as any).units) {
			playerUnits = (session.team as any).units;
			// Hydrate units to ensure they have necessary arrays (prevent crash on partial data)
			playerUnits.forEach(u => {
				u.effects = u.effects || [];
				u.reactions = u.reactions || [];
				// Ensure full life at start of combat
				u.life = u.maxLife;
			});
		}

		// Ensure Player has a Core unit
		const hasCore = playerUnits.some(u => u.isCore);
		if (!hasCore) {
			console.log("[createCombatState] Player missing Core. Adding default Protective Crystal.");

			// Find free slot for Core
			// Default preference: 1,1
			const freeSlot = BoardLogic.findFreeSlot(playerUnits, FORCE_ID_PLAYER, { x: 1, y: 1 });

			if (freeSlot) {
				const coreUnit = makeUnit(FORCE_ID_PLAYER, "protective_crystal", freeSlot);
				playerUnits.push(coreUnit);
			} else {
				console.error("[createCombatState] Could not find slot for Default Core!");
			}
		}

		console.log(`[createCombatState] Parsed Player Units Count: ${playerUnits.length}`);

		// Mock State
		const state: any = {
			gameData: {
				player: {
					id: FORCE_ID_PLAYER,
					wins: session.wins,
					losses: session.losses,
					units: playerUnits,
					items: [],
					gold: 0
				},
				runStats: {},
				settings: {}
			},
			battleData: {
				forces: [makeForce(FORCE_ID_PLAYER), makeForce(FORCE_ID_CPU)],
				units: [],
				projectiles: [],
				containers: {}
			},
			time: { time: 0, delta: 0 }
		};

		// Generate Enemy Team
		// We need available cards for the generator
		const allCards = Card.getAvailableCards();
		const enemyUnits = generateEnemyTeam(state, session.round, allCards);

		// Combine units
		// Ensure force IDs are correct
		playerUnits.forEach(u => u.force = FORCE_ID_PLAYER);
		enemyUnits.forEach(u => u.force = FORCE_ID_CPU);

		state.battleData.units = [...playerUnits, ...enemyUnits];

		return state as State;
	}

	private async advancePhase(session: PlayerSession, nextSeed: string, wonLastCombat: boolean) {
		let wins = session.wins;
		let losses = session.losses;

		if (wonLastCombat) wins++; else losses++;

		let nextPhase = 'encounter';
		if (wins >= 10) nextPhase = 'victory';
		if (losses >= 4) nextPhase = 'game_over';

		const nextRound = session.round + 1;

		await pool.query('UPDATE player_sessions SET phase = $1, round = $2, step = 1, seed = $3, wins = $4, losses = $5, current_options = null, team = $8, action_log = $7::jsonb, updated_at = now() WHERE id = $6',
			[nextPhase, nextRound, nextSeed, wins, losses, session.id, JSON.stringify([]), JSON.stringify({ units: session.team ? (session.team as any).units : [] })]); // Persist team (might be modified? No, combat doesn't modify persistent team usually, but health resets. Actually we keep same team object)

		console.log(`Session ${session.player_id} advanced. Wins: ${wins}, Losses: ${losses}. Next Phase: ${nextPhase}`);
	}
}
