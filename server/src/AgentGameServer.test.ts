/**
 * @jest-environment node
 */

import { AddressInfo } from "net";
import { createServer, request as httpRequest, Server } from "http";
import { BASE_COLLECTION_DATA } from "@game/Data/BaseCollection";
import { registerCollection } from "@game/Models/Entities/Card";
import { createAgentGameServerApp, createAgentGameStore } from "./agentGameServer";

beforeAll(() => {
	registerCollection(BASE_COLLECTION_DATA);
});

const startServer = async (): Promise<{ server: Server; baseUrl: string }> => {
	const app = createAgentGameServerApp(createAgentGameStore());
	const server = createServer(app);

	await new Promise<void>((resolve) => {
		server.listen(0, "127.0.0.1", () => resolve());
	});

	const address = server.address() as AddressInfo;
	return {
		server,
		baseUrl: `http://127.0.0.1:${address.port}`,
	};
};

const sendRequest = async ({
	url,
	method,
	body,
}: {
	url: string;
	method: "GET" | "POST" | "DELETE";
	body?: unknown;
}): Promise<{ status: number; json: unknown }> => {
	const target = new URL(url);

	return await new Promise((resolve, reject) => {
		const request = httpRequest(
			{
				hostname: target.hostname,
				port: target.port,
				path: target.pathname + target.search,
				method,
				headers: body
					? {
						"Content-Type": "application/json",
					}
					: undefined,
			},
			(response) => {
				let raw = "";
				response.setEncoding("utf8");
				response.on("data", (chunk) => {
					raw += chunk;
				});
				response.on("end", () => {
					resolve({
						status: response.statusCode || 0,
						json: raw.length > 0 ? JSON.parse(raw) : null,
					});
				});
			}
		);

		request.on("error", reject);

		if (body !== undefined) {
			request.write(JSON.stringify(body));
		}

		request.end();
	});
};

describe("agent game server", () => {
	it("creates a game and exposes the initial state over HTTP", async () => {
		const { server, baseUrl } = await startServer();

		try {
			const response = await sendRequest({
				url: `${baseUrl}/games`,
				method: "POST",
				body: {
					playerId: "http-player-1",
					selectedCrystalId: "crystal_core",
					initialSeed: "http-seed-1",
					gameId: "http-game-1",
				},
			});
			const payload = response.json as {
				gameId: string;
				state: {
					board: { units: Array<{ cardId: string; isCore: boolean }> };
					choices: { phase: string };
				};
			};

			expect(response.status).toBe(201);
			expect(payload.gameId).toBe("http-game-1");
			expect(payload.state.board.units[0].isCore).toBe(true);
			expect(payload.state.choices.phase).toBe("encounter");
		} finally {
			await new Promise<void>((resolve, reject) => {
				server.close((error) => (error ? reject(error) : resolve()));
			});
		}
	});

	it("lets an external client read board, move units, inspect a card, and make a choice", async () => {
		const { server, baseUrl } = await startServer();

		try {
			await sendRequest({
				url: `${baseUrl}/games`,
				method: "POST",
				body: {
					playerId: "http-player-2",
					selectedCrystalId: "crystal_core",
					initialSeed: "http-seed-2",
					gameId: "http-game-2",
				},
			});

			const boardBeforeResponse = await sendRequest({
				url: `${baseUrl}/games/http-game-2/board`,
				method: "GET",
			});
			const boardBefore = boardBeforeResponse.json as {
				board: { units: Array<{ unitId: string; position: { x: number; y: number } }> };
			};

			const core = boardBefore.board.units[0];

			const moveResponse = await sendRequest({
				url: `${baseUrl}/games/http-game-2/board`,
				method: "POST",
				body: { moves: [{ unitId: core.unitId, x: 0, y: 2 }] },
			});
			const movedBoard = moveResponse.json as {
				board: { units: Array<{ position: { x: number; y: number } }> };
			};

			expect(moveResponse.status).toBe(200);
			expect(movedBoard.board.units[0].position).toEqual({ x: 0, y: 2 });

			const choicesResponse = await sendRequest({
				url: `${baseUrl}/games/http-game-2/choices`,
				method: "GET",
			});
			const choicesPayload = choicesResponse.json as {
				choices: { options: Array<{ id: string }> };
			};

			const cardResponse = await sendRequest({
				url: `${baseUrl}/games/http-game-2/cards/${choicesPayload.choices.options[0].id}`,
				method: "GET",
			});
			if (cardResponse.status === 200) {
				const cardPayload = cardResponse.json as { card: { id: string } };
				expect(cardPayload.card.id).toBe(choicesPayload.choices.options[0].id);
			}

			const choiceResponse = await sendRequest({
				url: `${baseUrl}/games/http-game-2/choices`,
				method: "POST",
				body: { selection: 1 },
			});
			const choicePayload = choiceResponse.json as {
				result: {
					selectedActionId: string;
					manifest: { actions: Array<{ teamSnapshot?: { units: Array<{ position: { x: number; y: number } }> } }> };
					state: { choices: { phase: string } };
				};
			};

			expect(choiceResponse.status).toBe(200);
			expect(choicePayload.result.selectedActionId).toBe(choicesPayload.choices.options[0].id);
			expect(choicePayload.result.manifest.actions).toHaveLength(1);
			expect(choicePayload.result.manifest.actions[0].teamSnapshot?.units[0].position).toEqual({
				x: 0,
				y: 2,
			});
			expect(["shop", "orb_shop", "combat"].includes(choicePayload.result.state.choices.phase)).toBe(true);
		} finally {
			await new Promise<void>((resolve, reject) => {
				server.close((error) => (error ? reject(error) : resolve()));
			});
		}
	});
});