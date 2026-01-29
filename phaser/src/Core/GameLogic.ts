import { SessionData } from "./Types";
import { State } from "../Models/State";
import { Unit, makeUnit } from "../Models/Entities/Unit";
import { pickRandom } from "../utils";
import * as Card from "../Models/Entities/Card";
import * as BoardLogic from "../Models/BoardLogic";
import { generateEnemyTeam } from "../Scenes/Battleground/generateEnemyTeam";
import { runCombat } from "../Scenes/Battleground/RunCombatCore";
import { createServerCombatEffects } from "../Scenes/Battleground/ServerCombatEffects";
import { FORCE_ID_PLAYER, FORCE_ID_CPU } from "../Scenes/Battleground/ServerConstants";
import { makeForce } from "../Models/Entities/Force";
import { BASE_COLLECTION_DATA } from "../Data/BaseCollection";
import { registerCollection } from "../Models/Entities/Card";
import * as Random from "../Utils/Random";

// Register base collection to ensure unit definitions exist
registerCollection(BASE_COLLECTION_DATA);

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

export class GameLogic {
	public static createInitialSession(playerId: string, selectedCrystalId?: string): SessionData {
		const seed = Math.random().toString(36).substring(7);
		const initialSeed = seed;

		let team: any = { units: [] };
		if (selectedCrystalId) {
			const coreUnit = makeUnit(FORCE_ID_PLAYER, selectedCrystalId, { x: 1, y: 1 });
			coreUnit.isCore = true;
			team.units.push(coreUnit);
		}

		const session: SessionData = {
			id: '',
			player_id: playerId,
			phase: 'encounter',
			round: 1,
			step: 1,
			seed,
			initial_seed: initialSeed,
			action_log: [],
			wins: 0,
			losses: 0,
			team,
			current_options: null
		};

		const options = this.generateEncounterOptions(session);
		session.current_options = options.options;

		return session;
	}

	public static generateEnemyTeamForRound(round: number, wins: number): any[] {
		// CPU should have access to all non-core units, disregarding unlock status
		const allCards = Card.getNonCores();
		const mockState = {
			battleData: { forces: [makeForce(FORCE_ID_PLAYER), makeForce(FORCE_ID_CPU)] },
			gameData: { player: { wins, id: FORCE_ID_PLAYER } }
		} as any;
		const units = generateEnemyTeam(mockState, round, allCards);
		// Explicitly assign to CPU force to ensure correctness regardless of mock state nuances
		units.forEach(u => u.force = FORCE_ID_CPU);
		return units;
	}

	public static stringToSeed(str: string): number {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash;
		}
		return Math.abs(hash);
	}

	public static generateNextSeed(currentSeed: string, actionId: string): string {
		const input = currentSeed + actionId;
		let hash = 0;
		for (let i = 0; i < input.length; i++) {
			const char = input.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash;
		}
		return Math.abs(hash).toString(36);
	}

	public static generateEncounterOptions(session: SessionData): { options: any[], nextPhase?: string } {
		// At step 4, show combat_encounter as the only option (pre-combat warning)
		if (session.step === 4) {
			return { options: [{ id: 'combat_encounter' }] };
		}

		const seedNum = this.stringToSeed(session.seed);
		const shuffled = [...ENCOUNTER_IDS];
		let currentSeedVal = seedNum;

		for (let i = shuffled.length - 1; i > 0; i--) {
			const x = Math.sin(currentSeedVal++) * 10000;
			const rnd = x - Math.floor(x);
			const j = Math.floor(rnd * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}

		return { options: shuffled.slice(0, 3).map(id => ({ id })) };
	}

	public static generateShopOptions(session: SessionData, triggerActionId?: string): { options: any[] } {
		let encounterId = null;

		if (triggerActionId) {
			encounterId = triggerActionId;
		} else {
			const previousStep = session.step - 1;
			const lastEncounterAction = session.action_log.find((a: any) => a.round === session.round && a.step === previousStep);
			encounterId = lastEncounterAction ? lastEncounterAction.actionId : null;
		}

		let filterType = "";
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

		const allCards = Card.getNonCores();
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

		if (filteredCards.length === 0) {
			filteredCards = allCards;
		}

		const options = pickRandom(filteredCards, 3).map(card => ({
			id: card.id,
			cost: 10
		}));

		return { options };
	}

	public static resolveAction(session: SessionData, actionId: string, payload?: any): { team: any, updates?: string[] } {
		const availableCards = Card.getNonCores();
		const card = availableCards.find(c => c.id === actionId);

		let team = session.team ? JSON.parse(JSON.stringify(session.team)) : { units: [] };
		let units = team.units || [];
		const updates: string[] = [];

		if (card) {
			const existingUnitIndex = units.findIndex((u: any) => u.cardId === actionId);
			if (existingUnitIndex >= 0) {
				const existingUnit = units[existingUnitIndex];
				if (existingUnit.rank < 4) {
					existingUnit.rank++;
					existingUnit.maxLife = Math.floor(existingUnit.maxLife * 1.5);
					existingUnit.life = existingUnit.maxLife;
					existingUnit.power = Math.floor(existingUnit.power * 1.5);
					updates.push(`Upgraded unit ${actionId} to rank ${existingUnit.rank}`);
				}
			} else {
				if (units.length < 9) {
					const targetPos = BoardLogic.getEmptySlot(units, FORCE_ID_PLAYER);
					if (targetPos) {
						const newUnit = makeUnit(FORCE_ID_PLAYER, actionId, targetPos);

						const previousStep = session.step - 1;
						const lastEncounterAction = session.action_log.find((a: any) => a.round === session.round && a.step === previousStep);
						const encounterId = lastEncounterAction ? lastEncounterAction.actionId : null;
						let targetRank = 1;
						if (encounterId === 'silver_shop') targetRank = 2;
						if (encounterId === 'gold_shop') targetRank = 3;

						if (targetRank > 1) {
							newUnit.rank = targetRank;
							const extraLevels = targetRank - 1;
							for (let i = 0; i < extraLevels; i++) {
								newUnit.maxLife = Math.floor(newUnit.maxLife * 1.5);
								newUnit.life = newUnit.maxLife;
								newUnit.power = Math.floor(newUnit.power * 1.5);
							}
							updates.push(`Recruited unit ${actionId} at Rank ${newUnit.rank}`);
						}

						units.push(newUnit);
						updates.push(`Added new unit ${actionId}`);
					}
				}
			}
		} else {
			if (actionId === 'apply_orb' && payload) {
				const { orbId, targetUnitId } = payload;
				const targetUnit = units.find((u: any) => u.id === targetUnitId);
				if (targetUnit) {
					updates.push(`Applying orb ${orbId} to ${targetUnitId}`);
					if (payload.orbId === 'upgrade_orb') {
						targetUnit.rank = (targetUnit.rank || 1) + 1;
						targetUnit.maxLife = Math.floor(targetUnit.maxLife * 1.5);
						targetUnit.life = targetUnit.maxLife;
						targetUnit.power = Math.floor(targetUnit.power * 1.5);
					} else if (payload.orbId === 'absorb_power_orb') {
						let totalAbsorbed = 0;
						units.forEach((u: any) => {
							if (u.id !== targetUnit.id && u.position && u.position.y === targetUnit.position.y) {
								const absorbed = Math.floor(u.power * 0.25);
								if (absorbed > 0) {
									u.power = Math.max(0, u.power - absorbed);
									totalAbsorbed += absorbed;
								}
							}
						});
						if (totalAbsorbed > 0) {
							targetUnit.power = (targetUnit.power || 0) + totalAbsorbed;
							targetUnit.bonusPower = (targetUnit.bonusPower || 0) + totalAbsorbed;
						}
					} else if (payload.orbId === 'distribute_power_orb') {
						const powerToDistribute = Math.floor(targetUnit.power * 0.5);
						if (powerToDistribute > 0) {
							targetUnit.power = Math.max(0, targetUnit.power - powerToDistribute);
							const bonusToLose = Math.max(0, Math.min(targetUnit.bonusPower || 0, powerToDistribute));
							targetUnit.bonusPower = (targetUnit.bonusPower || 0) - bonusToLose;

							const targets = units.filter((u: any) => u.id !== targetUnit.id && u.position && u.position.y === targetUnit.position.y);
							if (targets.length > 0) {
								const powerPerTarget = Math.floor(powerToDistribute / targets.length);
								targets.forEach((u: any) => {
									u.power = (u.power || 0) + powerPerTarget;
									u.bonusPower = (u.bonusPower || 0) + powerPerTarget;
								});
							}
						}
					} else if (payload.orbId.startsWith('increase_power_on_')) {
						const type = payload.orbId.replace('increase_power_on_', '');
						if (targetUnit.effects?.some((e: any) => e.id === type)) {
							const pct = Math.floor(targetUnit.power * 0.1);
							targetUnit.power += pct;
							updates.push(`Increased power of ${targetUnit.id} by ${pct} (on ${type})`);
						}
					} else if (payload.orbId.startsWith('increase_critical_on_')) {
						const type = payload.orbId.replace('increase_critical_on_', '');
						if (targetUnit.effects?.some((e: any) => e.id === type)) {
							targetUnit.effects = targetUnit.effects || [];
							targetUnit.effects.push({ id: 'increase_critical', amount: 10, targets: { id: 'self' } });
							updates.push(`Increased critical of ${targetUnit.id} (on ${type})`);
						}
					} else if (payload.orbId.startsWith('decrease_cooldown_on_')) {
						const type = payload.orbId.replace('decrease_cooldown_on_', '');
						if (targetUnit.effects?.some((e: any) => e.id === type)) {
							targetUnit.cooldown = Math.max(1000, targetUnit.cooldown * 0.9);
							updates.push(`Decreased cooldown of ${targetUnit.id} (on ${type})`);
						}
					}
				}
			} else if (actionId === 'discard_unit' && payload && payload.unitId) {
				const unitIndex = units.findIndex((u: any) => u.id === payload.unitId);
				if (unitIndex >= 0) {
					const unit = units[unitIndex];
					if (!unit.isCore) {
						units.splice(unitIndex, 1);
						updates.push(`Discarded unit ${payload.unitId}`);
					}
				}
			}
		}

		team.units = units;
		return { team, updates };
	}

	public static validateAndApplyTeamUpdate(session: SessionData, newTeam: any): { team: any, valid: boolean } {
		const currentUnits = session.team?.units || [];
		const newUnits = newTeam?.units || [];

		if (currentUnits.length !== newUnits.length) {
			return { team: session.team, valid: false };
		}

		const currentUnitMap = new Map();
		currentUnits.forEach((u: any) => currentUnitMap.set(u.id, u));

		const validatedUnits = [];

		for (const newUnit of newUnits) {
			const originalUnit = currentUnitMap.get(newUnit.id);
			if (!originalUnit) {
				return { team: session.team, valid: false };
			}

			if (originalUnit.cardId !== newUnit.cardId ||
				originalUnit.rank !== newUnit.rank) {
				return { team: session.team, valid: false };
			}

			const validatedUnit = {
				...originalUnit,
				position: newUnit.position
			};
			validatedUnits.push(validatedUnit);
		}

		return { team: { units: validatedUnits }, valid: true };
	}

	public static simulateCombat(session: SessionData): { finalState: State, initialUnits: Unit[], logs: any[] } {
		const combatState = this.createCombatState(session);

		const seedVal = this.stringToSeed(session.initial_seed);
		Random.setSeed(seedVal);

		const initialUnits = JSON.parse(JSON.stringify(combatState.battleData.units));

		const effects = createServerCombatEffects(combatState);
		const combatRunner = runCombat(combatState, effects);

		const SIM_DELTA = 16.67;
		let frame = 0;
		const MAX_FRAMES = 10000;
		while (combatRunner.isActive() && frame < MAX_FRAMES) {
			effects.setFrame(frame);
			combatRunner.updateFrame(combatState, frame * SIM_DELTA, SIM_DELTA);
			frame++;
		}

		return { finalState: combatState, initialUnits, logs: effects.logs };
	}

	private static createCombatState(session: SessionData): State {
		let playerUnits: Unit[] = [];
		if (session.team && (session.team as any).units) {
			playerUnits = JSON.parse(JSON.stringify((session.team as any).units));
			playerUnits.forEach(u => {
				u.effects = u.effects || [];
				u.reactions = u.reactions || [];
				u.life = u.maxLife;
			});
		}

		const hasCore = playerUnits.some(u => u.isCore);
		if (!hasCore) {
			const freeSlot = BoardLogic.findFreeSlot(playerUnits, FORCE_ID_PLAYER, { x: 1, y: 1 });
			if (freeSlot) {
				const crystal = makeUnit(FORCE_ID_PLAYER, "crystal_core", freeSlot);
				crystal.isCore = true;
				playerUnits.push(crystal);
			}
		}

		let enemyUnits: Unit[] = [];
		if (session.current_options && (session.current_options as any).combatState && (session.current_options as any).combatState.enemyTeam) {
			enemyUnits = JSON.parse(JSON.stringify((session.current_options as any).combatState.enemyTeam));
		} else {
			const allCards = Card.getNonCores();
			const mockState = {
				battleData: { forces: [makeForce(FORCE_ID_PLAYER), makeForce(FORCE_ID_CPU)] },
				gameData: { player: { wins: session.wins || 0, id: FORCE_ID_PLAYER } }
			} as any;
			enemyUnits = generateEnemyTeam(mockState, session.round, allCards);
			enemyUnits.forEach(u => u.force = FORCE_ID_CPU);
		}

		return {
			savedGames: [],
			gameData: {
				round: session.round,
				hour: 0,
				player: makeForce(FORCE_ID_PLAYER),
				recentEncounterIds: [],
				runStats: {} as any,
				seed: this.stringToSeed(session.initial_seed),
				initialSeed: this.stringToSeed(session.initial_seed),
				isSeeded: true
			},
			battleData: {
				forces: [makeForce(FORCE_ID_PLAYER), makeForce(FORCE_ID_CPU)],
				grid: BoardLogic.createGrid(),
				units: [...playerUnits, ...enemyUnits]
			}
		};
	}

	public static processSessionTurn(
		session: SessionData,
		actionId: string,
		payload?: any
	): { session: SessionData; updates: string[] | undefined; combatResult?: { won: boolean } } {
		const { team, updates } = this.resolveAction(session, actionId, payload);
		let nextSession = { ...session, team };
		let combatResult = undefined;

		return { session: nextSession, updates, combatResult };
	}

	public static transitionToNextState(session: SessionData, actionId: string, payload?: any): { session: SessionData, combatResult?: { won: boolean } } {
		const nextSession = JSON.parse(JSON.stringify(session)); // Deep copy

		// Handle orb shop / upgrade phase completion - just advance without modifying team
		let newSeed: string;
		if ((nextSession.phase === 'orb_shop' && actionId === 'orb_shop_done') ||
			(nextSession.phase === 'upgrade_core' && actionId === 'upgrade_core_done') ||
			(nextSession.phase === 'add_reaction_core' && actionId === 'add_reaction_core_done')) {
			// Don't apply resolveAction, just transition to next phase
			// (the effects were already applied via previous actions)
			newSeed = this.generateNextSeed(nextSession.seed, actionId);
			nextSession.seed = newSeed;

			// After upgrade phase, reset to start of next round
			if ((nextSession.phase === 'upgrade_core' || nextSession.phase === 'add_reaction_core') &&
				(actionId === 'upgrade_core_done' || actionId === 'add_reaction_core_done')) {
				nextSession.round += 1;
				nextSession.step = 0; // Will become 1 after increment below
			}
		} else {
			// Apply the action to update team state (e.g., purchasing units)
			const { team } = this.resolveAction(nextSession, actionId, payload);
			nextSession.team = team;

			newSeed = this.generateNextSeed(nextSession.seed, actionId);
			nextSession.seed = newSeed;

			const actionEntry = { round: nextSession.round, phase: nextSession.phase, step: nextSession.step, actionId, payload };
			nextSession.action_log = [...(nextSession.action_log || []), actionEntry];
		}

		let nextPhase: SessionData['phase'] = 'encounter';
		let nextOptions = null;
		let combatResult = undefined;

		// Hardcoded phase sequence:
		// Each "encounter → recruit" is one step
		// Step 1, 2, 3: encounter phases (internally each goes encounter → shop → complete)
		// Step 4: combat_encounter (warning before combat)
		// Step 5: combat
		// Step 6: upgrade_core or add_reaction_core (only before round 15)
		// Then reset to step 1 for next round

		const currentStep = nextSession.step;
		const currentPhase = nextSession.phase;

		// Check if actionId is a card purchase (any card from the available cards)
		const availableCards = Card.getNonCores();
		const isCardPurchase = availableCards.some(c => c.id === actionId);

		// Handle orb shop transitions from special encounters (same step, just change phase to orb_shop)
		if (actionId === 'upgrade_unit' || actionId === 'power_distributor' || actionId === 'power_absorber') {
			nextPhase = 'orb_shop';
			if (actionId === 'upgrade_unit') nextOptions = [{ id: 'upgrade_orb' }];
			if (actionId === 'power_distributor') nextOptions = [{ id: 'distribute_power_orb' }];
			if (actionId === 'power_absorber') nextOptions = [{ id: 'absorb_power_orb' }];
		}
		// Completing orb_shop completes the encounter step
		else if (currentPhase === 'orb_shop' && actionId === 'orb_shop_done') {
			// After orb_shop, increment step and determine next phase
			nextSession.step += 1;
			const nextStep = nextSession.step;
			if (nextStep <= 3) {
				nextPhase = 'encounter';
				const encounterResult = this.generateEncounterOptions(nextSession);
				nextOptions = encounterResult.options;
			} else if (nextStep === 4) {
				nextPhase = 'encounter';
				nextOptions = [{ id: 'combat_encounter' }];
			}
		}
		// Handle combat_encounter transition to combat
		else if (actionId === 'combat_encounter') {
			nextPhase = 'combat';
			nextSession.step += 1;
		}
		// Current phase is encounter, selected an encounter (not combat_encounter) -> transition to shop (same step)
		else if (currentPhase === 'encounter' && actionId !== 'combat_encounter' && currentStep <= 3) {
			nextPhase = 'shop';
			const shopResult = this.generateShopOptions(nextSession, actionId);
			nextOptions = shopResult.options;
		}
		// Current phase is shop, completed purchase (card ID) or skip -> increment step and go to next encounter
		else if (currentPhase === 'shop' && (isCardPurchase || actionId === 'skip_shop' || actionId === 'phase_complete')) {
			nextSession.step += 1;
			const nextStep = nextSession.step;
			if (nextStep <= 3) {
				nextPhase = 'encounter';
				const encounterResult = this.generateEncounterOptions(nextSession);
				nextOptions = encounterResult.options;
			} else if (nextStep === 4) {
				nextPhase = 'encounter';
				nextOptions = [{ id: 'combat_encounter' }];
			}
		}
		// After combat (combat_done action), check for upgrade phase
		else if (currentPhase === 'combat' && actionId === 'combat_done') {
			nextSession.step += 1;
			if (nextSession.round < 15) {
				nextPhase = nextSession.round % 2 === 0 ? 'add_reaction_core' : 'upgrade_core';
				// Generate appropriate upgrade options based on phase type
				if (nextPhase === 'upgrade_core') {
					nextOptions = [
						{ id: 'increase_core_max_life' },
						{ id: 'upgrade_core_power' },
						{ id: 'decrease_core_cooldown' }
					];
				} else {
					// add_reaction_core options
					nextOptions = [
						{ id: 'on_100_damage_effect' },
						{ id: 'on_crit_effect' },
						{ id: 'on_battle_start_effect' }
					];
				}
			} else {
				// No upgrade phase after round 15, start next round
				nextSession.round += 1;
				nextSession.step = 1; // Reset to step 1 for next round
				nextPhase = 'encounter';
				const encounterResult = this.generateEncounterOptions(nextSession);
				nextOptions = encounterResult.options;
			}
		}
		// After upgrade phase, start next round
		else if (currentPhase === 'upgrade_core' || currentPhase === 'add_reaction_core') {
			// Check if the action is one of the valid upgrade/reaction options
			const upgradeOptions = ['increase_core_max_life', 'upgrade_core_power', 'decrease_core_cooldown'];
			const reactionOptions = ['on_100_damage_effect', 'on_ally_death_effect', 'on_crit_effect', 'on_battle_start_effect'];
			const isUpgradeAction = upgradeOptions.includes(actionId) || reactionOptions.includes(actionId);

			if (isUpgradeAction || actionId === 'phase_complete') {
				nextSession.round += 1;
				nextSession.step = 1; // Reset to step 1 for next round
				nextPhase = 'encounter';
				const encounterResult = this.generateEncounterOptions(nextSession);
				nextOptions = encounterResult.options;
			}
		}

		nextSession.phase = nextPhase;
		nextSession.current_options = nextOptions ? { options: nextOptions } : null;

		if (nextPhase === 'combat') {
			const enemyTeam = this.generateEnemyTeamForRound(nextSession.round, nextSession.wins);

			nextSession.current_options = { combatState: { enemyTeam } };

			const simResult = this.simulateCombat(nextSession);
			const playerUnits = simResult.finalState.battleData.units.filter((u: any) => u.force === 'PLAYER');

			const outcomeLog = simResult.logs.find((l: any) => l.type === 'outcome');
			let wonCombat = false;
			if (outcomeLog) {
				wonCombat = outcomeLog.result === 'player_won';
			} else {
				const core = playerUnits.find((u: any) => u.isCore);
				wonCombat = !!(core && core.life > 0);
			}

			nextSession.wins += (wonCombat ? 1 : 0);
			nextSession.losses += (wonCombat ? 0 : 1);

			const combatState = {
				enemyTeam,
				seed: newSeed,
				wonCombat,
				initialUnits: simResult.initialUnits,
				finalPlayerUnits: playerUnits,
				logs: simResult.logs
			};

			const options = [{ id: 'combat_done', label: 'Continue' }];
			nextSession.current_options = { options, combatState };

			combatResult = { won: wonCombat };
		}

		nextSession.updated_at = new Date();
		return { session: nextSession, combatResult };
	}
}
