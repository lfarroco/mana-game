import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockArcaneMissileTargeted = jest.fn<
	(
		source: unknown,
		target: unknown,
		config: {
			onHit: () => void;
			colors: number[];
		}
	) => void
>();
const mockGetCharaById = jest.fn<(unitId: string) => unknown>();
const mockHasCharaById = jest.fn<(unitId: string) => boolean>();
const mockResolveTargets = jest.fn<() => unknown[]>();
const mockUpdatePowerDisplay = jest.fn<(unitId: string) => void>();

const mockState = {
	session: {
		team: {
			units: [] as Array<Record<string, unknown>>,
		},
	},
};

jest.mock("@Effects/index", () => ({
	arcaneMissileTargeted: (
		source: unknown,
		target: unknown,
		config: {
			onHit: () => void;
			colors: number[];
		}
	) => mockArcaneMissileTargeted(source, target, config),
}));

jest.mock("@Models/State", () => ({
	getState: () => mockState,
}));

jest.mock("@Systems/Chara/Chara", () => ({
	upgradeUnit: jest.fn(),
	getCharaById: (unitId: string) => mockGetCharaById(unitId),
	hasCharaById: (unitId: string) => mockHasCharaById(unitId),
}));

jest.mock("@Systems/Chara/PowerDisplay", () => ({
	updatePowerDisplay: (unitId: string) => mockUpdatePowerDisplay(unitId),
}));

jest.mock("@TriggerSystem/TriggerSystem", () => ({
	processEffectsIO: jest.fn(),
	resolveTargets: () => mockResolveTargets(),
	processReactions: jest.fn(),
}));

jest.mock("@i18n/i18n", () => ({
	t: (key: string) => key,
}));

jest.mock("@Systems/Chara/CharaTooltip", () => ({
	getReactionDescription: () => "",
}));

jest.mock("@Models/Entities/Card", () => ({
	getPlayerPersistentCore: () => ({ id: "core-id", power: 100, maxLife: 1000 }),
}));

jest.mock("@Systems/PoisonDamageSystem", () => ({
	initializePoisonSystem: () => ({}),
}));

jest.mock("@Systems/RegenSystem", () => ({
	initializeRegenSystem: () => ({}),
}));

jest.mock("@Systems/CombatStatsTracker", () => ({
	initialize: () => ({}),
}));

jest.mock("@Core/Combat/ForceStatsState", () => ({
	initializeForceStatsState: () => ({}),
}));

jest.mock("@Utils/Logger", () => ({
	createLogger: () => ({
		debug: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	}),
}));

jest.mock("@utils", () => ({
	pickOne: <T>(items: T[]) => items[0],
}));

import { orbsIndex } from "@Systems/Shop/Orbs";

describe("power transfer orb visuals", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockArcaneMissileTargeted.mockImplementation((_source, _target, config) => {
			config.onHit();
		});
		mockGetCharaById.mockImplementation((unitId) => ({ charaId: unitId }));
		mockHasCharaById.mockReturnValue(true);
		mockResolveTargets.mockReturnValue([]);
		mockState.session.team.units = [];
	});

	it("plays projectile visuals for distribute power orbs", () => {
		const sourceUnit = {
			id: "source-unit",
			force: "player",
			power: 100,
			bonusPower: 20,
			position: { x: 1, y: 0 },
			effects: [],
			reactions: [],
		};
		const allyUnit = {
			id: "ally-unit",
			force: "player",
			power: 25,
			bonusPower: 5,
			position: { x: 0, y: 0 },
			effects: [],
			reactions: [],
		};

		mockState.session.team.units = [sourceUnit, allyUnit];
		mockResolveTargets.mockReturnValue([allyUnit]);

		const applied = orbsIndex.distribute_power_orb().effect(sourceUnit as never);

		expect(applied).toBe(true);
		expect(mockArcaneMissileTargeted).toHaveBeenCalledWith(
			{ charaId: "source-unit" },
			{ charaId: "ally-unit" },
			expect.objectContaining({
				colors: [0xffa500, 0xff8c00, 0xff4500],
			})
		);
		expect(sourceUnit.power).toBe(50);
		expect(sourceUnit.bonusPower).toBe(0);
		expect(allyUnit.power).toBe(75);
		expect(allyUnit.bonusPower).toBe(55);
		expect(mockUpdatePowerDisplay).toHaveBeenCalledWith("source-unit");
		expect(mockUpdatePowerDisplay).toHaveBeenCalledWith("ally-unit");
	});

	it("plays projectile visuals for absorb power orbs", () => {
		const sourceUnit = {
			id: "source-unit",
			force: "player",
			power: 40,
			bonusPower: 0,
			position: { x: 1, y: 0 },
			effects: [],
			reactions: [],
		};
		const allyUnit = {
			id: "ally-unit",
			force: "player",
			power: 100,
			bonusPower: 10,
			position: { x: 0, y: 0 },
			effects: [],
			reactions: [],
		};

		mockState.session.team.units = [sourceUnit, allyUnit];
		mockResolveTargets.mockReturnValue([allyUnit]);

		const applied = orbsIndex.absorb_power_orb().effect(sourceUnit as never);

		expect(applied).toBe(true);
		expect(mockArcaneMissileTargeted).toHaveBeenCalledWith(
			{ charaId: "ally-unit" },
			{ charaId: "source-unit" },
			expect.objectContaining({
				colors: [0x8a2be2, 0x9400d3, 0x9932cc],
			})
		);
		expect(sourceUnit.power).toBe(65);
		expect(sourceUnit.bonusPower).toBe(25);
		expect(allyUnit.power).toBe(75);
		expect(mockUpdatePowerDisplay).toHaveBeenCalledWith("ally-unit");
		expect(mockUpdatePowerDisplay).toHaveBeenCalledWith("source-unit");
	});
});
