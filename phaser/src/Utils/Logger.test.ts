/* eslint-disable no-console */

/**
 * Tests for the simplified functional Logger API.
 *
 * In the test environment (JEST_WORKER_ID / NODE_ENV=test) every logger
 * function must be a no-op and never touch the console.
 */

import { debug, info, warn, error } from "@Utils/Logger";

describe("Logger (functional API)", () => {
	let spy: jest.SpyInstance;

	beforeEach(() => {
		spy = jest.spyOn(console, "log").mockImplementation(() => {});
		jest.spyOn(console, "warn").mockImplementation(() => {});
		jest.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		spy.mockRestore();
		(console.warn as unknown as jest.SpyInstance).mockRestore?.();
		(console.error as unknown as jest.SpyInstance).mockRestore?.();
	});

	it("is a no-op in the test environment (does not call console)", () => {
		debug("TestContext", "debug message", { a: 1 });
		info("TestContext", "info message");
		warn("TestContext", "warn message");
		error("TestContext", "error message", { err: "boom" });

		expect(console.log).not.toHaveBeenCalled();
		expect(console.warn).not.toHaveBeenCalled();
		expect(console.error).not.toHaveBeenCalled();
	});

	it("accepts context as the first argument", () => {
		// Should not throw and should not log during tests.
		expect(() => info("MyModule", "hi")).not.toThrow();
	});
});
