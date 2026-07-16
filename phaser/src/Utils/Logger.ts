/* eslint-disable no-console */

type LogLevel = "debug" | "info" | "warn" | "error";

type LogPayload = {
	ts: string;
	level: LogLevel;
	context: string;
	message: string;
	meta?: unknown;
};

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40,
};

const overrideLogLevel: LogLevel | null = null;

const getEnv = (): Record<string, string | undefined> => {
	if (typeof process === "undefined" || !process.env) return {};
	return process.env as Record<string, string | undefined>;
};

const isTestEnv = (): boolean => {
	const env = getEnv();
	return env.JEST_WORKER_ID !== undefined || env.NODE_ENV === "test";
};

const resolveConfiguredLogLevel = (): LogLevel => {
	if (overrideLogLevel) return overrideLogLevel;

	const envLevel = getEnv().LOG_LEVEL?.toLowerCase();
	if (envLevel === "debug" || envLevel === "info" || envLevel === "warn" || envLevel === "error") {
		return envLevel;
	}

	try {
		const storedLevel = localStorage.getItem("mana_log_level")?.toLowerCase();
		if (
			storedLevel === "debug" ||
			storedLevel === "info" ||
			storedLevel === "warn" ||
			storedLevel === "error"
		) {
			return storedLevel;
		}
	} catch {
		// localStorage may be unavailable in some environments (tests, SSR).
	}

	return getEnv().NODE_ENV === "production" ? "warn" : "debug";
};

const shouldLog = (level: LogLevel): boolean => {
	const configuredLevel = resolveConfiguredLogLevel();
	return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[configuredLevel];
};

const getConsoleMethod = (level: LogLevel): ((...args: unknown[]) => void) => {
	if (level === "error") return console.error;
	if (level === "warn") return console.warn;
	return console.log;
};

const writeElectronLog = (payload: LogPayload): void => {
	const runtimeWindow = typeof window !== "undefined" ? window : undefined;
	const electronLogger = (
		runtimeWindow as unknown as {
			electronLogger?: { log: (level: LogLevel, payload: string) => void };
		}
	)?.electronLogger;

	if (!electronLogger) return;

	try {
		electronLogger.log(payload.level, JSON.stringify(payload));
	} catch {
		// Never fail gameplay because logging transport failed.
	}
};

const writeLog = (level: LogLevel, context: string, message: string, meta?: unknown): void => {
	if (!shouldLog(level)) return;

	const payload: LogPayload = {
		ts: new Date().toISOString(),
		level,
		context,
		message,
		...(meta !== undefined ? { meta } : {}),
	};

	getConsoleMethod(level)(payload);
	writeElectronLog(payload);
};

const noop = (): void => {};

/**
 * Log a debug-level message. First argument is the context (module/scope).
 */
export const debug = (context: string, message: string, meta?: unknown): void => {
	if (isTestEnv()) return noop();
	writeLog("debug", context, message, meta);
};

/**
 * Log an info-level message. First argument is the context (module/scope).
 */
export const info = (context: string, message: string, meta?: unknown): void => {
	if (isTestEnv()) return noop();
	writeLog("info", context, message, meta);
};

/**
 * Log a warning-level message. First argument is the context (module/scope).
 */
export const warn = (context: string, message: string, meta?: unknown): void => {
	if (isTestEnv()) return noop();
	writeLog("warn", context, message, meta);
};

/**
 * Log an error-level message. First argument is the context (module/scope).
 */
export const error = (context: string, message: string, meta?: unknown): void => {
	if (isTestEnv()) return noop();
	writeLog("error", context, message, meta);
};

export type { LogLevel };
