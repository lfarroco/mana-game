/* eslint-disable no-console */

type LogLevel = "debug" | "info" | "warn" | "error";

const getEnv = (): Record<string, string | undefined> => {
	if (typeof process === "undefined" || !process.env) return {};
	return process.env as Record<string, string | undefined>;
};

const isTestEnv = (): boolean => {
	const env = getEnv();
	return env.JEST_WORKER_ID !== undefined || env.NODE_ENV === "test";
};


export const debug = (context: string, message: string, meta?: unknown): void => {
	if (isTestEnv()) return;
	console.debug(context, message, meta);
};

export const info = (context: string, message: string, meta?: unknown): void => {
	if (isTestEnv()) return;
	console.log(context, message, meta)
};

export const warn = (context: string, message: string, meta?: unknown): void => {
	if (isTestEnv()) return;
	console.warn(context, message, meta);
};

export const error = (context: string, message: string, meta?: unknown): void => {
	if (isTestEnv()) return;
	console.error(context, message, meta);
};

export type { LogLevel };
