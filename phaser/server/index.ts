import { createServer } from "http";
import { AddressInfo } from "net";
import { createAgentGameServerApp } from "./agentGameServer";

type CliOptions = {
	host: string;
	port: number;
};

const DEFAULT_HOST = process.env.MANA_AGENT_SERVER_HOST || "127.0.0.1";
const DEFAULT_PORT = Number(process.env.MANA_AGENT_SERVER_PORT || "8787");

const readArgValue = (args: string[], flag: string): string | undefined => {
	const index = args.indexOf(flag);
	if (index < 0) {
		return undefined;
	}

	return args[index + 1];
};

export function parseCliOptions(args: string[]): CliOptions {
	const host = readArgValue(args, "--host") || DEFAULT_HOST;
	const portValue = readArgValue(args, "--port");
	const port = portValue ? Number(portValue) : DEFAULT_PORT;

	if (!Number.isInteger(port) || port <= 0 || port > 65535) {
		throw new Error(`Invalid port: ${portValue || String(port)}`);
	}

	return { host, port };
}

export async function startAgentGameServer(args: string[] = process.argv.slice(2)) {
	const options = parseCliOptions(args);
	const app = createAgentGameServerApp();
	const server = createServer(app);

	await new Promise<void>((resolve, reject) => {
		server.once("error", reject);
		server.listen(options.port, options.host, () => {
			server.off("error", reject);
			resolve();
		});
	});

	const address = server.address() as AddressInfo;
	console.log(`Mana agent game server listening on http://${address.address}:${address.port}`);
	console.log("Endpoints: POST /games, GET /games/:gameId/state, POST /games/:gameId/board, POST /games/:gameId/choices");

	const shutdown = () => {
		server.close(() => {
			process.exit(0);
		});
	};

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);

	return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
	startAgentGameServer().catch((error) => {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	});
}