import { Unit, makeUnit } from "./Entities/Unit";
import { cpuForce } from "./Entities/Force";
import { vec2 } from "../Models/Geometry";
import { Effect, EffectReaction } from "../TriggerSystem/TriggerSystem";

const STORAGE_KEY = 'mana-game-ghosts-v1';

export type GhostUnit = {
	cardId: string;
	x: number;
	y: number;
	power?: number;
	effects?: Effect[];
	reactions?: EffectReaction[];
};

export type GhostEntry = {
	round: number;
	units: GhostUnit[];
	prestige: number;
	savedAt: number;
	hash: string;
};

export type GhostStoreData = {
	[round: number]: GhostEntry[];
};

function loadStore(): GhostStoreData {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null) return {};
		return parsed as GhostStoreData;
	} catch {
		return {};
	}
}

function saveStore(store: GhostStoreData) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
	} catch (err) {
		console.warn('[GhostStore] Failed to persist ghosts', err);
	}
}

function computeHash(units: GhostUnit[]): string {
	return units
		.slice()
		.sort((a, b) => a.cardId.localeCompare(b.cardId))
		.map(u => `${u.cardId}@${u.x},${u.y}@${u.power ?? ''}@${u.effects?.length ?? 0}@${u.reactions?.length ?? 0}`)
		.join('|');
}

export function saveGhostForRound(round: number, playerUnits: Unit[], prestige: number) {
	if (!round || round < 1) return;
	if (!playerUnits.length) return;

	const store = loadStore();

	const ghostUnits: GhostUnit[] = playerUnits.map(u => ({
		cardId: u.cardId,
		x: u.position.x,
		y: u.position.y,
		power: u.power,
		effects: u.effects?.map(e => ({ ...e })),
		reactions: u.reactions?.map(r => ({ ...r, effects: r.effects?.map(e => ({ ...e })) || [] })),
	}));

	const hash = computeHash(ghostUnits);
	const list = store[round] || [];
	if (list.some(e => e.hash === hash)) {
		return;
	}

	const entry: GhostEntry = {
		round,
		units: ghostUnits,
		prestige,
		savedAt: Date.now(),
		hash,
	};

	const MAX_PER_ROUND = 12;
	list.push(entry);
	list.sort((a, b) => b.savedAt - a.savedAt);
	store[round] = list.slice(0, MAX_PER_ROUND);
	saveStore(store);
	console.log(`[GhostStore] Saved ghost for round ${round}. Total for round: ${store[round].length}`);
}

export function pickRandomGhost(round: number): GhostEntry | null {
	const store = loadStore();
	const list = store[round];
	if (!list || !list.length) return null;
	const idx = Math.floor(Math.random() * list.length);
	return list[idx];
}

export function instantiateGhostUnits(entry: GhostEntry): Unit[] {
	return entry.units.map(g => {
		const unit = makeUnit(cpuForce.id, g.cardId, vec2(g.x, g.y));
		if (g.power && g.power > 0) unit.power = g.power;
		if (g.effects) unit.effects = g.effects.map(e => ({ ...e }));
		if (g.reactions) unit.reactions = g.reactions.map(r => ({ ...r, effects: r.effects?.map(e => ({ ...e })) || [] }));
		return unit;
	});
}

export function getGhostCountForRound(round: number): number {
	const store = loadStore();
	return store[round]?.length || 0;
}
