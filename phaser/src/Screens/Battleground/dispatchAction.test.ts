/**
 * Tests for `dispatchAction`'s failure semantics.
 *
 * A rejected dispatch must (a) restore the outgoing phase's UI, (b) tell the
 * player, and (c) resolve `false` so callers can release their per-phase input
 * latch. The previous implementation rethrew into fire-and-forget callers
 * (`dispatchAction(...)` in the encounter cards), which left an unhandled
 * rejection and a latched, dead phase: the reported "I pick an option and the
 * game never advances".
 *
 * Phaser and most battleground UI is mocked — only the transition orchestration
 * in BattlegroundScene is under test.
 */

import { env } from "@Env";
import { PHASE_TYPES } from "@game/types/session";
import * as Modal from "@Components/Modal/Modal";
import * as UIButton from "@Components/Button/UIButton";
import { authSession } from "@lib/authSession";
import { go } from "@Scenes/AppRouter";
import { RemoteServerError } from "../../RemoteServer";
import { BattlegroundEvent } from "../../Events";
import * as UI from "./Components/UI/UI";
import {
	CLIENT_ONLY_PHASES,
	PHASES,
	dispatchAction,
	reportUnknownPhase,
	resetActionFailureState,
} from "./BattlegroundScene";
jest.mock("@Env", () => {
	const mockEnv = {
		// `reportActionFailure` only paints while the battleground is the active
		// screen (ScreenScene#screenName) — see BattlegroundScene.
		scene: {
			screenName: "battleground",
			add: { text: jest.fn(() => ({ setOrigin: jest.fn() })) },
		},
		state: {
			session: { phase: "encounter", session_type: { type: "singleplayer" } },
			combatState: undefined,
		},
		dispatch: jest.fn(),
		updateState: jest.fn(),
		// The re-auth bounce resets client state so the dead session's
		// session_type cannot leak into the next run entry.
		resetState: jest.fn(),
	};
	return { env: mockEnv };
});

// ScreenScene extends Phaser.Scene at import time — stub it for the same reason
// AppRouter.test.ts does (see that suite's comment).
jest.mock("@Scenes/ScreenScene", () => ({
	ScreenScene: class {
		readonly screenName = "battleground";
		revealScreen(): void {}
	},
}));

jest.mock("./Components", () => ({
	Background: { create: jest.fn() },
	NamesDisplay: { create: jest.fn() },
	Board: { create: jest.fn() },
	DiscardZone: { create: jest.fn() },
	UI: { create: jest.fn() },
}));

// BattlegroundScene imports the HUD module directly (not through ./Components),
// so it needs its own mock — the real one touches Phaser display objects.
jest.mock("./Components/UI/UI", () => ({
	create: jest.fn(),
	registerListeners: jest.fn(() => []),
	syncLivesDisplay: jest.fn(),
	syncRoundDisplay: jest.fn(),
	handleUserMessageRequested: jest.fn(async () => {}),
	destroy: jest.fn(),
}));

jest.mock("./Phases", () => ({
	ShopPhase: jest.fn(),
	openOrbShop: jest.fn(),
	UpgradeCorePhase: jest.fn(),
	AddReactionCorePhase: jest.fn(),
	AwakenPhase: jest.fn(),
	CombatPhase: jest.fn(),
	GameOverPhase: jest.fn(),
	VictoryPhase: jest.fn(),
	CombatVictoryPhase: jest.fn(),
	CombatDefeatPhase: jest.fn(),
}));

jest.mock("./phaseTransitions", () => ({ slideTransition: {} }));
jest.mock("@Components/Board/Board", () => ({
	create: jest.fn(),
	setIsInputEnabled: jest.fn(),
}));
jest.mock("@Components/Chara/Chara", () => ({ clearAll: jest.fn() }));
jest.mock("@Systems/AudioManager", () => ({ playMusic: jest.fn() }));
jest.mock("./Phases/Encounter/Encounter", () => ({
	encounterPhase: jest.fn(() => jest.fn()),
}));
jest.mock("./playerBoardSync", () => ({ syncPlayerBoardUnits: jest.fn(async () => {}) }));
jest.mock("@Scenes/AppRouter", () => ({ go: jest.fn(async () => {}) }));
jest.mock("./Phases/Combat/handleCombatPhase", () => ({
	resetCombatPhaseState: jest.fn(),
}));

// Recovery UI and the auth session: only the *decision* (modal vs toast) and
// the modal button's action are under test here.
jest.mock("@Components/Modal/Modal", () => ({
	createModal: jest.fn(() => ({
		container: { add: jest.fn() },
		close: jest.fn(async () => {}),
	})),
}));
jest.mock("@Components/Button/UIButton", () => ({ create: jest.fn(() => ({ container: {} })) }));
jest.mock("@lib/authSession", () => ({ authSession: { clearSession: jest.fn() } }));
jest.mock("../../RemoteServer", () => ({
	RemoteServerError: class RemoteServerError extends Error {
		readonly status: number;
		readonly code: string;
		constructor(status: number, code: string, message: string) {
			super(message);
			this.name = "RemoteServerError";
			this.status = status;
			this.code = code;
		}
	},
}));

type MockEnv = {
	state: { session: { phase: string }; combatState?: unknown };
	dispatch: jest.Mock;
	updateState: jest.Mock;
	resetState: jest.Mock;
};

const mockedEnv = env as unknown as MockEnv;
const mockedUI = UI as unknown as {
	handleUserMessageRequested: jest.Mock;
	registerListeners: jest.Mock;
};
const mockCreateModal = Modal.createModal as unknown as jest.Mock;
const mockButtonCreate = UIButton.create as unknown as jest.Mock;
const mockClearSession = authSession.clearSession as unknown as jest.Mock;
const mockGo = go as unknown as jest.Mock;

/** The callback the last recovery modal's button was created with. */
const lastModalAction = (): (() => void) => mockButtonCreate.mock.calls[0][0].callback;

/** Session shape returned by a successful dispatch. */
const nextSession = (phase: string) => ({
	session: { phase, session_type: { type: "singleplayer" } },
});

describe("dispatchAction", () => {
	let errorSpy: jest.SpyInstance;

	beforeEach(() => {
		jest.clearAllMocks();
		mockedEnv.state = {
			session: { phase: "encounter", session_type: { type: "singleplayer" } } as never,
		};
		errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		errorSpy.mockRestore();
	});

	it("applies state and emits the phase switch on success", async () => {
		mockedEnv.dispatch.mockResolvedValue(nextSession("shop"));

		await expect(dispatchAction({ type: "skip" })).resolves.toBe(true);

		expect(mockedEnv.updateState).toHaveBeenCalledTimes(1);
		expect(mockedEnv.updateState.mock.calls[0][0].session.phase).toBe("shop");
		expect(mockedUI.handleUserMessageRequested).not.toHaveBeenCalled();
	});

	it("restores the phase, reports, and resolves false when the dispatch fails", async () => {
		mockedEnv.dispatch.mockRejectedValue(new Error("HTTP 500: server error"));

		await expect(dispatchAction({ type: "skip" })).resolves.toBe(false);

		// Session state is untouched — the player stays in the same phase.
		expect(mockedEnv.updateState).not.toHaveBeenCalled();
		// The failure is logged with its cause and shown to the player.
		expect(errorSpy).toHaveBeenCalled();
		expect(mockedUI.handleUserMessageRequested).toHaveBeenCalledWith(
			expect.objectContaining({ type: "error" })
		);
	});

	it("releases the transition lock after a failure so the player can retry", async () => {
		mockedEnv.dispatch.mockRejectedValueOnce(new Error("network down"));
		await expect(dispatchAction({ type: "skip" })).resolves.toBe(false);

		// A retry must actually reach the server (the old code latched in the
		// caller; the lock here must not be left set either).
		mockedEnv.dispatch.mockResolvedValueOnce(nextSession("shop"));
		await expect(dispatchAction({ type: "skip" })).resolves.toBe(true);
		expect(mockedEnv.dispatch).toHaveBeenCalledTimes(2);
	});
});

describe("failure reporting", () => {
	let errorSpy: jest.SpyInstance;

	beforeEach(() => {
		jest.clearAllMocks();
		resetActionFailureState();
		mockedEnv.state = {
			session: { phase: "encounter", session_type: { type: "singleplayer" } } as never,
		};
		errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		resetActionFailureState();
		errorSpy.mockRestore();
	});

	it("sends the player back through login when the bearer token expired (401)", async () => {
		mockedEnv.dispatch.mockRejectedValueOnce(
			new RemoteServerError(401, "invalid_token", "Invalid or expired token")
		);

		await expect(dispatchAction({ type: "skip" })).resolves.toBe(false);

		// A toast would be lost behind the navigation — this uses a modal, and
		// the dead credential is only dropped once the player acts on it.
		expect(mockedUI.handleUserMessageRequested).not.toHaveBeenCalled();
		expect(mockCreateModal).toHaveBeenCalledTimes(1);
		expect(mockClearSession).not.toHaveBeenCalled();

		// The run is intact server-side: re-login, then the lobby offers RESUME.
		lastModalAction()();
		expect(mockClearSession).toHaveBeenCalledTimes(1);
		// Client state is reset so the dead session's multiplayer type cannot
		// leak into the next single-player run entry.
		expect(mockedEnv.resetState).toHaveBeenCalledTimes(1);
		expect(mockGo).toHaveBeenCalledWith("multiplayer_login");
	});

	it("shows at most one recovery modal while failures keep arriving", async () => {
		mockedEnv.dispatch.mockRejectedValue(
			new RemoteServerError(401, "invalid_token", "Invalid or expired token")
		);

		await dispatchAction({ type: "skip" });
		await dispatchAction({ type: "skip" });

		expect(mockCreateModal).toHaveBeenCalledTimes(1);
	});

	it("offers the main menu for a phase this build cannot render", () => {
		reportUnknownPhase("time_travel");

		expect(mockCreateModal).toHaveBeenCalledTimes(1);
		expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("time_travel"));

		// The only way out is the main-menu path (reset state + title).
		const listener = jest.fn();
		const dispose = BattlegroundEvent.mainMenuRequested.listen(listener);
		lastModalAction()();
		expect(listener).toHaveBeenCalledTimes(1);
		dispose();
	});
});

describe("phase coverage", () => {
	it("declares a renderer for every phase core can produce", () => {
		// A phase the client does not declare makes PhaseController.go() warn
		// and return — the outgoing UI has already slid out and the session has
		// already advanced, so the run looks frozen with no error. This holds
		// the client and core's PHASE_TYPES together across version skew.
		expect(Object.keys(PHASES).sort()).toEqual([...PHASE_TYPES, ...CLIENT_ONLY_PHASES].sort());
	});
});
