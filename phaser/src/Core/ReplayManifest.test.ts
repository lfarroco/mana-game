import type { RunManifest, SessionData } from "@Core/Types";
import type { Unit } from "@Models/Entities/Unit";
import type { CombatLogEntry } from "@Core/Combat/ServerCombatEffects";

jest.mock("@main", () => ({
	game: {
		scene: { getScene: jest.fn() },
		events: { once: jest.fn() },
	},
}));

let GameLogic: typeof import("@Core/GameLogic");

beforeAll(async () => {
	const g = globalThis as unknown as {
		Phaser?: {
			Scene: new (...args: unknown[]) => unknown;
		};
	};

	if (!g.Phaser) {
		g.Phaser = {
			Scene: class { },
		};
	}

	if (typeof global.structuredClone === "undefined") {
		global.structuredClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj)) as T;
	}

	GameLogic = await import("@Core/GameLogic");
});

type CombatRecord = {
	enemyTeam: Unit[];
	logs: CombatLogEntry[];
	wonCombat: boolean;
};

const normalizeCombatLogs = (
	logs: CombatLogEntry[]
): Array<Record<string, unknown> & { type: string }> =>
	logs.map((entry) => {
		const normalized: Record<string, unknown> & { type: string } = {
			...entry,
			type: entry.type,
		};

		delete normalized.sourceId;
		delete normalized.targetId;
		delete normalized.unitId;

		if (entry.unitStats) {
			normalized.unitStats = entry.unitStats.map(([, stats]) => {
				const nextStats = { ...stats } as Record<string, unknown>;
				delete nextStats.unitId;
				return nextStats;
			});
		}

		if (entry.currentCombatStats) {
			normalized.currentCombatStats = entry.currentCombatStats.map(([, stats]) => ({
				...stats,
			}));
		}

		return normalized;
	});

const normalizeCombatRecords = (records: CombatRecord[]) =>
	records.map((record) => ({
		wonCombat: record.wonCombat,
		enemyTeam: record.enemyTeam.map((unit) => ({
			cardId: unit.cardId,
			rank: unit.rank,
			position: unit.position,
			power: unit.power,
			maxLife: unit.maxLife,
		})),
		logs: normalizeCombatLogs(record.logs),
	}));

const getOptions = (session: SessionData): string[] => {
	if (!session.current_options) return [];

	if (Array.isArray(session.current_options)) {
		return session.current_options.map((o) => o.id);
	}

	return session.current_options.options.map((o) => o.id);
};

const isTerminal = (session: SessionData): boolean =>
	session.phase === "victory" || session.phase === "game_over";

const cloneTeamSnapshot = (session: SessionData): { units: Unit[] } =>
	JSON.parse(JSON.stringify(session.team));

const getCombatState = (
	session: SessionData
): { enemyTeam: Unit[]; logs: CombatLogEntry[]; wonCombat?: boolean } | undefined => {
	if (
		typeof session.current_options === "object" &&
		session.current_options !== null &&
		"combatState" in session.current_options
	) {
		return session.current_options.combatState;
	}
	return undefined;
};

type RecordedRun = {
	manifest: RunManifest;
	finalSession: SessionData;
	combatRecords: CombatRecord[];
};

const runDeterministicSession = ({
	playerId,
	crystalId,
	initialSeed,
	runId,
	maxActions,
}: {
	playerId: string;
	crystalId: string;
	initialSeed: string;
	runId: string;
	maxActions: number;
}): RecordedRun => {
	let session = GameLogic.createInitialSession(playerId, crystalId, initialSeed);

	const actions: RunManifest["actions"] = [];
	const combatRecords: CombatRecord[] = [];

	for (let sequence = 1; sequence <= maxActions; sequence++) {
		if (isTerminal(session)) break;

		const options = getOptions(session);
		if (options.length === 0) break;

		const actionId = options[0];
		actions.push({
			sequence,
			actionId,
			teamSnapshot: cloneTeamSnapshot(session),
		});

		const { session: next } = GameLogic.transitionToNextState(session, actionId);
		session = next;

		if (actionId === "combat_encounter") {
			const combatState = getCombatState(session);
			expect(combatState).toBeDefined();
			combatRecords.push({
				enemyTeam: JSON.parse(JSON.stringify(combatState?.enemyTeam ?? [])),
				logs: JSON.parse(JSON.stringify(combatState?.logs ?? [])),
				wonCombat: !!combatState?.wonCombat,
			});
		}
	}

	return {
		manifest: {
			runId,
			playerId,
			selectedCrystalId: crystalId,
			initialSeed,
			clientVersion: "test",
			actions,
		},
		finalSession: session,
		combatRecords,
	};
};

const replayWithCapturedCombats = (
	manifest: RunManifest,
	enemyTeams: Unit[][]
): { finalSession: SessionData; combatRecords: CombatRecord[] } => {
	let session = GameLogic.createInitialSession(
		manifest.playerId,
		manifest.selectedCrystalId,
		manifest.initialSeed
	);
	session.id = `replay-${manifest.runId}`;

	const combatRecords: CombatRecord[] = [];
	let combatIndex = 0;

	for (const envelope of manifest.actions) {
		if (envelope.teamSnapshot) {
			const { team, valid } = GameLogic.validateAndApplyTeamUpdate(session, envelope.teamSnapshot);
			if (valid) {
				session = { ...session, team };
			}
		}

		let transitionOptions: { combatEnemyTeam?: Unit[] } | undefined;
		if (envelope.actionId === "combat_encounter") {
			const storedTeam = enemyTeams[combatIndex];
			if (storedTeam) {
				transitionOptions = { combatEnemyTeam: storedTeam };
			}
			combatIndex++;
		}

		const { session: next } = GameLogic.transitionToNextState(
			session,
			envelope.actionId,
			envelope.payload,
			transitionOptions
		);
		session = next;

		if (envelope.actionId === "combat_encounter") {
			const combatState = getCombatState(session);
			expect(combatState).toBeDefined();
			combatRecords.push({
				enemyTeam: JSON.parse(JSON.stringify(combatState?.enemyTeam ?? [])),
				logs: JSON.parse(JSON.stringify(combatState?.logs ?? [])),
				wonCombat: !!combatState?.wonCombat,
			});
		}
	}

	return { finalSession: session, combatRecords };
};

describe("replayManifest", () => {
	it("replays a seeded server-side run with matching snapshot and combat outcomes", () => {
		const initialSeed = "server-seed-replay-001";
		const recorded = runDeterministicSession({
			playerId: "player-1",
			crystalId: "crystal_core",
			initialSeed,
			runId: "run-replay-001",
			maxActions: 10,
		});

		expect(recorded.manifest.actions.length).toBeGreaterThanOrEqual(5);
		expect(recorded.manifest.actions.length).toBeLessThanOrEqual(10);

		const enemyTeams = recorded.combatRecords.map((combat) => combat.enemyTeam);
		const replayed = GameLogic.replayManifest(recorded.manifest, { enemyTeams });

		expect(replayed.rejectReason).toBeUndefined();

		const originalSnapshot = GameLogic.buildReplaySnapshot(recorded.finalSession);
		const replaySnapshot = GameLogic.buildReplaySnapshot(replayed.session);
		expect(replaySnapshot).toEqual(originalSnapshot);

		const replayWithLogs = replayWithCapturedCombats(recorded.manifest, enemyTeams);
		const replayWithLogsSnapshot = GameLogic.buildReplaySnapshot(replayWithLogs.finalSession);
		expect(replayWithLogsSnapshot).toEqual(originalSnapshot);

		expect(normalizeCombatRecords(replayWithLogs.combatRecords)).toEqual(
			normalizeCombatRecords(recorded.combatRecords)
		);
	});

	it("rejects manifests with sequence gaps", () => {
		const manifest: RunManifest = {
			runId: "run-seq-gap",
			playerId: "player-1",
			selectedCrystalId: "crystal_core",
			initialSeed: "seed-gap-1",
			clientVersion: "test",
			actions: [
				{ sequence: 1, actionId: "forest_pools" },
				{ sequence: 3, actionId: "combat_encounter" },
			],
		};

		const replayed = GameLogic.replayManifest(manifest);

		expect(replayed.rejectReason).toContain("Action sequence gap");
	});
});
