/**
 * Combat results "Continue" (end_combat) failure handling.
 *
 * The results panel and the combat board used to be torn down *before* the
 * `end_combat` dispatch. When that request failed, the phase restored — but the
 * panel holding the Continue button was already destroyed, so the player could
 * not retry; only the HUD main menu was left. The teardown now runs inside
 * `dispatchAction`'s success callback, after the server accepted the action and
 * before the next phase builds.
 */

import { env } from "@Env";
import * as Board from "@Components/Board/Board";
import * as Chara from "@Components/Chara/Chara";
import * as ForceStats from "@Screens/Battleground/Components/ForceStats";
import * as namesDisplay from "@Screens/Battleground/Components/UI/namesDisplay";
import * as VictoryUI from "@Screens/Battleground/Components/Results/VictoryUI";
import { BattlegroundEvent } from "../../../../Events";
import type { BGContext } from "../../BattlegroundScene";
import { CombatVictoryPhase, resetCombatPhaseState } from "./handleCombatPhase";

jest.mock("@Env", () => ({
	env: {
		state: {
			session: { phase: "combat", wins: 0, round: 1, session_type: { type: "singleplayer" } },
			combatState: {
				units: [],
				logs: [],
				wonCombat: true,
				enemyPlayerName: "CPU",
			},
		},
		patchState: jest.fn(),
		scene: { tweens: { resumeAll: jest.fn() }, time: { paused: false } },
	},
}));

jest.mock("@Components/Board/Board", () => ({
	setIsInputEnabled: jest.fn(),
	setEnemyBoardVisible: jest.fn(),
	setPlayerSlotsVisible: jest.fn(),
}));
jest.mock("@Components/Chara/Chara", () => ({ clearAll: jest.fn() }));
jest.mock("@Screens/Battleground/Components/UI/namesDisplay", () => ({
	updateNameDisplay: jest.fn(),
}));
jest.mock("@Screens/Battleground/Components/ForceStats", () => ({
	setCombatClientState: jest.fn(),
	destroyForceStats: jest.fn(),
	resetPlayerForceStats: jest.fn(),
	createForceStats: jest.fn(),
}));
jest.mock("@Screens/Battleground/Phases/Combat/CombatPlaybackController", () => ({
	createCombatPlaybackController: jest.fn(),
}));
jest.mock("@Screens/Battleground/Components/Results/VictoryUI", () => ({
	displayVictory: jest.fn(),
}));
jest.mock("@Screens/Battleground/Components/Results/DefeatUI", () => ({
	displayDefeat: jest.fn(),
}));

// The unit under test: `dispatchAction` is stubbed so the test controls whether
// the success callback (the teardown) runs.
const mockDispatchAction = jest.fn();
jest.mock("../../BattlegroundScene", () => ({
	dispatchAction: (...args: unknown[]) => mockDispatchAction(...args),
}));

const mockedEnv = env as unknown as { patchState: jest.Mock };
const mockDisplayVictory = VictoryUI.displayVictory as unknown as jest.Mock;

/** Fake results container the phase tracks and the continue handler destroys. */
const makePanel = () => ({ destroy: jest.fn() });

type Listeners = Map<unknown, () => void | Promise<void>>;

/** Build a fake BGContext that records the phase's event subscriptions. */
function makeContext(listeners: Listeners): BGContext {
	return {
		track: jest.fn(),
		listen: (event: unknown, cb: () => void | Promise<void>) => {
			listeners.set(event, cb);
		},
		go: jest.fn(async () => {}),
		events: BattlegroundEvent,
	} as unknown as BGContext;
}

describe("combat results continue", () => {
	let listeners: Listeners;
	let continueRequested: () => void | Promise<void>;
	let panel: ReturnType<typeof makePanel>;

	beforeEach(async () => {
		jest.clearAllMocks();
		resetCombatPhaseState();

		panel = makePanel();
		mockDisplayVictory.mockResolvedValue(panel);

		listeners = new Map();
		await CombatVictoryPhase(makeContext(listeners));
		continueRequested = listeners.get(BattlegroundEvent.combatContinueRequested)!;
		expect(continueRequested).toBeDefined();
	});

	it("keeps the results board intact when end_combat fails, so Continue can be retried", async () => {
		mockDispatchAction.mockResolvedValue(false);

		await continueRequested();

		expect(mockDispatchAction).toHaveBeenCalledTimes(1);
		// Nothing was torn down — the panel (and its Continue button) survived,
		// and the frozen battle board is still behind it.
		expect(panel.destroy).not.toHaveBeenCalled();
		expect(Board.setEnemyBoardVisible).not.toHaveBeenCalled();
		expect(Chara.clearAll).not.toHaveBeenCalled();
		expect(mockedEnv.patchState).not.toHaveBeenCalled();
	});

	it("tears the combat layer down once end_combat is accepted", async () => {
		mockDispatchAction.mockImplementation(
			async (
				_action: unknown,
				onBeforeFinish?: (response: { session: { wins: number; round: number } }) => Promise<void>
			) => {
				await onBeforeFinish?.({ session: { wins: 1, round: 2 } });
				return true;
			}
		);

		await continueRequested();

		// Teardown ran inside the (successful) dispatch, before the next phase.
		expect(panel.destroy).toHaveBeenCalledTimes(1);
		expect(Board.setEnemyBoardVisible).toHaveBeenCalledWith(false);
		expect(mockedEnv.patchState).toHaveBeenCalledWith({ combatState: undefined });
		expect(namesDisplay.updateNameDisplay).toHaveBeenCalledWith({ enemyName: "" });
		expect(ForceStats.destroyForceStats).toHaveBeenCalled();
	});
});
