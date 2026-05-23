import express, { type Express, type NextFunction, type Request, type Response } from "express";
import {
	createLlmPlayerService,
} from "@game/Core/GameLogic";

type AgentGameRecord = {
	id: string;
	service: any;
	createdAt: string;
};

type AgentGameStore = {
	games: Map<string, AgentGameRecord>;
	createGame(config: any): AgentGameRecord;
	getGame(gameId: string): AgentGameRecord | null;
	deleteGame(gameId: string): boolean;
	listGames(): AgentGameRecord[];
};

type CreateGameRequestBody = {
	playerId?: string;
	selectedCrystalId?: string;
	initialSeed?: string;
	clientVersion?: string;
	runId?: string;
	gameId?: string;
};

type ArrangeBoardRequestBody = {
	moves: Array<{ unitId: string; x: number; y: number }>;
};

type MakeChoiceRequestBody = {
	selection: number | string;
	payload?: unknown;
};

const createGameId = (): string =>
	`game_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const sendBadRequest = (response: Response, message: string): void => {
	response.status(400).json({ error: message });
};

const sendNotFound = (response: Response, message: string): void => {
	response.status(404).json({ error: message });
};

const getStringValue = (value: unknown): string | undefined =>
	typeof value === "string" && value.trim().length > 0 ? value : undefined;

const createStore = (): AgentGameStore => {
	const games = new Map<string, AgentGameRecord>();

	return {
		games,

		createGame(config: any): AgentGameRecord {
			const id = config.runId || createGameId();
			const record: AgentGameRecord = {
				id,
				service: createLlmPlayerService({
					...config,
					runId: id,
				}),
				createdAt: new Date().toISOString(),
			};
			games.set(id, record);
			return record;
		},

		getGame(gameId: string): AgentGameRecord | null {
			return games.get(gameId) || null;
		},

		deleteGame(gameId: string): boolean {
			return games.delete(gameId);
		},

		listGames(): AgentGameRecord[] {
			return Array.from(games.values());
		},
	};
};

const parseCreateGameConfig = (body: unknown): any | { error: string } => {
	if (!body || typeof body !== "object") {
		return { error: "Request body must be a JSON object" };
	}

	const payload = body as CreateGameRequestBody;
	const playerId = getStringValue(payload.playerId);
	const selectedCrystalId = getStringValue(payload.selectedCrystalId);

	if (!playerId) {
		return { error: "playerId is required" };
	}

	if (!selectedCrystalId) {
		return { error: "selectedCrystalId is required" };
	}

	return {
		playerId,
		selectedCrystalId,
		initialSeed: getStringValue(payload.initialSeed),
		clientVersion: getStringValue(payload.clientVersion),
		runId: getStringValue(payload.gameId) || getStringValue(payload.runId),
	};
};

const getGameOrRespond = (
	store: AgentGameStore,
	response: Response,
	gameId: string
): AgentGameRecord | null => {
	const game = store.getGame(gameId);
	if (!game) {
		sendNotFound(response, `Game ${gameId} was not found`);
		return null;
	}
	return game;
};

export function createAgentGameServerApp(store: AgentGameStore = createStore()): Express {
	const app = express();

	app.use(express.json());
	app.use((request: Request, response: Response, next: NextFunction) => {
		response.header("Access-Control-Allow-Origin", "*");
		response.header("Access-Control-Allow-Headers", "Content-Type");
		response.header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
		if (request.method === "OPTIONS") {
			response.sendStatus(204);
			return;
		}
		next();
	});

	app.get("/health", (_request, response) => {
		response.json({ ok: true, games: store.listGames().length });
	});

	app.get("/games", (_request, response) => {
		response.json({
			games: store.listGames().map((game) => ({
				id: game.id,
				createdAt: game.createdAt,
				actionCount: game.service.buildRunManifest().actions.length,
				snapshot: game.service.viewState().snapshot,
			})),
		});
	});

	app.post("/games", (request, response) => {
		const parsed = parseCreateGameConfig(request.body);
		if ("error" in parsed) {
			sendBadRequest(response, parsed.error);
			return;
		}

		const game = store.createGame(parsed);
		response.status(201).json({
			gameId: game.id,
			createdAt: game.createdAt,
			state: game.service.viewState(),
		});
	});

	app.get("/games/:gameId/state", (request, response) => {
		const game = getGameOrRespond(store, response, request.params.gameId);
		if (!game) {
			return;
		}

		response.json({ gameId: game.id, state: game.service.viewState() });
	});

	app.get("/games/:gameId/board", (request, response) => {
		const game = getGameOrRespond(store, response, request.params.gameId);
		if (!game) {
			return;
		}

		response.json({ gameId: game.id, board: game.service.viewBoard() });
	});

	app.post("/games/:gameId/board", (request, response) => {
		const game = getGameOrRespond(store, response, request.params.gameId);
		if (!game) {
			return;
		}

		const payload = request.body as ArrangeBoardRequestBody;
		if (!payload || !Array.isArray(payload.moves)) {
			sendBadRequest(response, "moves must be an array");
			return;
		}

		try {
			const board = game.service.arrangeBoard(payload.moves);
			response.json({ gameId: game.id, board, state: game.service.viewState() });
		} catch (error) {
			sendBadRequest(response, error instanceof Error ? error.message : "Invalid board arrangement");
		}
	});

	app.get("/games/:gameId/choices", (request, response) => {
		const game = getGameOrRespond(store, response, request.params.gameId);
		if (!game) {
			return;
		}

		response.json({ gameId: game.id, choices: game.service.viewChoices() });
	});

	app.post("/games/:gameId/choices", (request, response) => {
		const game = getGameOrRespond(store, response, request.params.gameId);
		if (!game) {
			return;
		}

		const payload = request.body as MakeChoiceRequestBody;
		if (!payload || (!["string", "number"].includes(typeof payload.selection))) {
			sendBadRequest(response, "selection must be a string id or a 1-based numeric index");
			return;
		}

		try {
			const result = game.service.makeChoice(payload.selection, payload.payload);
			response.json({ gameId: game.id, result });
		} catch (error) {
			sendBadRequest(response, error instanceof Error ? error.message : "Invalid choice");
		}
	});

	app.get("/games/:gameId/cards/:cardId", (request, response) => {
		const game = getGameOrRespond(store, response, request.params.gameId);
		if (!game) {
			return;
		}

		try {
			const card = game.service.viewCardDetails(request.params.cardId);
			response.json({ gameId: game.id, card });
		} catch (error) {
			sendBadRequest(response, error instanceof Error ? error.message : "Invalid card id");
		}
	});

	app.get("/games/:gameId/manifest", (request, response) => {
		const game = getGameOrRespond(store, response, request.params.gameId);
		if (!game) {
			return;
		}

		response.json({ gameId: game.id, manifest: game.service.buildRunManifest() });
	});

	app.delete("/games/:gameId", (request, response) => {
		const deleted = store.deleteGame(request.params.gameId);
		if (!deleted) {
			sendNotFound(response, `Game ${request.params.gameId} was not found`);
			return;
		}

		response.status(204).send();
	});

	return app;
}

export function createAgentGameStore(): AgentGameStore {
	return createStore();
}