import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { PlaybackState } from "./types";

const mockMustGetCharaById = jest.fn<(id: string) => unknown>();
const mockGetUnit = jest.fn<(chara: unknown) => { force: string }>();
const mockShake = jest.fn<(chara: unknown) => void>();
const mockUpdatePoisonDisplay = jest.fn<(force: string, poison: number, delta: number) => void>();
const mockSyncPoisonDisplay = jest.fn<(force: string, poison: number) => void>();
const mockUpdateLifeDisplay = jest.fn();
const mockUpdateShieldDisplay = jest.fn();

jest.mock("@Components/Chara/Chara", () => ({
	mustGetCharaById: (id: string) => mockMustGetCharaById(id),
	getUnit: (chara: unknown) => mockGetUnit(chara),
	shake: (chara: unknown) => mockShake(chara),
}));

jest.mock("@Screens/Battleground/Components/ForceStats", () => ({
	updatePoisonDisplay: (force: string, poison: number, delta: number) =>
		mockUpdatePoisonDisplay(force, poison, delta),
	syncPoisonDisplay: (force: string, poison: number) => mockSyncPoisonDisplay(force, poison),
	updateLifeDisplay: (...args: Array<unknown>) => mockUpdateLifeDisplay(...args),
	updateShieldDisplay: (...args: Array<unknown>) => mockUpdateShieldDisplay(...args),
}));

jest.mock("@Systems/AudioManager", () => ({
	playSoundEffect: jest.fn(),
}));

jest.mock("@Screens/Battleground/Phases/Combat/logHandlers/visuals/damage", () => ({
	damageFx: jest.fn(),
}));
jest.mock("@Screens/Battleground/Phases/Combat/logHandlers/visuals/heal", () => ({
	healFx: jest.fn(),
}));
jest.mock("@Screens/Battleground/Phases/Combat/logHandlers/visuals/shield", () => ({
	shieldFx: jest.fn(),
}));
jest.mock("@Screens/Battleground/Phases/Combat/logHandlers/visuals/poison", () => ({
	poisonFx: jest.fn(),
}));
jest.mock("../../../../../FX", () => ({
	arcaneMissileTargeted: jest.fn(),
}));

import { handleHealHit, handlePoisonHit } from "./projectileHandlers";

describe("handlePoisonHit", () => {
	const playbackState = {} as unknown as PlaybackState;

	beforeEach(() => {
		jest.clearAllMocks();
		mockMustGetCharaById.mockImplementation((id: string) => ({ id }));
		mockGetUnit.mockReturnValue({ force: "CPU" });
	});

	it("displays the cumulative poison stack, not just the last hit's increment", () => {
		const chara = { id: "enemy-core" };
		mockMustGetCharaById.mockReturnValue(chara);

		// 3 poison units at ~50+ power act twice: each hit adds ~6, the stack
		// grows to the mid-30s. The chip must show the stack (newPoison).
		handlePoisonHit(
			{
				type: "poison_hit",
				sourceId: "u1",
				targetId: "enemy-core",
				amount: 6,
				newPoison: 36,
				poisonDelta: 6,
			},
			playbackState
		);

		expect(mockMustGetCharaById).toHaveBeenCalledWith("enemy-core");
		expect(mockShake).toHaveBeenCalledWith(chara);
		expect(mockUpdatePoisonDisplay).toHaveBeenCalledWith("CPU", 36, 6);
	});

	it("keeps accumulating across successive hits", () => {
		const first = {
			type: "poison_hit",
			sourceId: "u1",
			targetId: "enemy-core",
			amount: 6,
			newPoison: 30,
			poisonDelta: 6,
		} as const;
		const second = {
			type: "poison_hit",
			sourceId: "u2",
			targetId: "enemy-core",
			amount: 6,
			newPoison: 36,
			poisonDelta: 6,
		} as const;

		handlePoisonHit(first, playbackState);
		handlePoisonHit(second, playbackState);

		expect(mockUpdatePoisonDisplay).toHaveBeenNthCalledWith(1, "CPU", 30, 6);
		expect(mockUpdatePoisonDisplay).toHaveBeenNthCalledWith(2, "CPU", 36, 6);
	});
});

describe("handleHealHit", () => {
	const playbackState = {} as unknown as PlaybackState;

	beforeEach(() => {
		jest.clearAllMocks();
		mockMustGetCharaById.mockImplementation((id: string) => ({ id }));
		mockGetUnit.mockReturnValue({ force: "PLAYER" });
	});

	it("syncs the poison chip to the post-cleanse total on the hit entry", () => {
		// Heal-cleanse (reducePoison) shrinks the force's stacks with no
		// poison_hit to move the chip — the handler must apply newPoison or
		// the counter drifts from the true stack.
		handleHealHit(
			{
				type: "heal_hit",
				sourceId: "u1",
				targetId: "player-core",
				amount: 100,
				newLife: 500,
				newPoison: 12,
				lifeDelta: 40,
			},
			playbackState
		);

		expect(mockUpdateLifeDisplay).toHaveBeenCalledWith("PLAYER", 500, 40);
		expect(mockSyncPoisonDisplay).toHaveBeenCalledWith("PLAYER", 12);
	});
});
