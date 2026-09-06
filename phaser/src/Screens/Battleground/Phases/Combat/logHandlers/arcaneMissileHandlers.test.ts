import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { PlaybackState } from "./types";

const mockGetCombatState = jest.fn<() => unknown>();
const mockUpdateChargeBar = jest.fn<(id: string) => void>();
const mockSyncPoisonDisplay = jest.fn<(force: string, poison: number) => void>();
const mockSyncRegenDisplay = jest.fn<(force: string, regen: number) => void>();

jest.mock("./combatStateStore", () => ({
	getCombatState: () => mockGetCombatState(),
}));

jest.mock("@Components/Chara/Chara", () => ({
	mustGetCharaById: jest.fn(),
	getUnit: jest.fn(),
}));

jest.mock("@Components/Chara/ChargeBarDisplay", () => ({
	updateChargeBar: (id: string) => mockUpdateChargeBar(id),
}));

jest.mock("@Screens/Battleground/Components/ForceStats", () => ({
	syncPoisonDisplay: (force: string, poison: number) => mockSyncPoisonDisplay(force, poison),
	syncRegenDisplay: (force: string, regen: number) => mockSyncRegenDisplay(force, regen),
}));

jest.mock("@Systems/AudioManager", () => ({
	playSoundEffect: jest.fn(),
}));

jest.mock("../../../../../FX", () => ({
	arcaneMissileTargeted: jest.fn(),
}));

import { handleDispelHit } from "./arcaneMissileHandlers";

describe("handleDispelHit", () => {
	const playbackState = {} as unknown as PlaybackState;

	beforeEach(() => {
		jest.clearAllMocks();
		mockGetCombatState.mockReturnValue({
			unitById: new Map([
				[
					"enemy-core",
					{
						force: "CPU",
						hasted: 100,
						slowed: 100,
						charge: 50,
						shield: 30,
						silenced: 100,
					},
				],
			]),
		});
	});

	it("resets the target force's poison and regen chips (dispel clears the stacks)", () => {
		// Dispel wipes the force-keyed stacks server-side with no hit entry
		// to move those chips — without the reset they freeze at pre-dispel
		// totals for the rest of the fight.
		handleDispelHit(
			{
				type: "dispel_hit",
				sourceId: "u1",
				targetId: "enemy-core",
			},
			playbackState
		);

		expect(mockUpdateChargeBar).toHaveBeenCalledWith("enemy-core");
		expect(mockSyncPoisonDisplay).toHaveBeenCalledWith("CPU", 0);
		expect(mockSyncRegenDisplay).toHaveBeenCalledWith("CPU", 0);
	});
});
