/**
 * Tests for PhaseController — the framework-free phase runner.
 *
 * This is the machinery that replaced `@mana/framework`'s phase tracker for the
 * battleground, so the guarantees it must preserve are: scoped teardown,
 * serialised transitions, pre-exit/restore for overlapping server dispatches,
 * and a chain that a failed handler cannot wedge.
 */

import { createEvent } from "@game/Models";
import {
	createPhaseController,
	type Destroyable,
	type EventRecord,
	type PhaseContext,
} from "./PhaseController";

type Phase = "a" | "b";

type Events = { ping: ReturnType<typeof createEvent<void>> };

const makeEvents = (): Events => ({ ping: createEvent<void>() });

/** A destroyable that appends `label` to `log` when destroyed. */
const element = (log: string[], label: string): Destroyable => ({
	destroy: () => {
		log.push(label);
	},
});

describe("createPhaseController", () => {
	it("destroys the previous phase's tracked resources on go()", async () => {
		const destroyed: string[] = [];
		let ctxRef: PhaseContext<Phase, Events> | null = null;

		const controller = createPhaseController<Phase, Events>({
			name: "test",
			events: makeEvents(),
			phases: {
				a: (_ctx) => {
					ctxRef = _ctx;
					_ctx.track(element(destroyed, "tracked"));
					return element(destroyed, "returned");
				},
				b: () => [element(destroyed, "b")],
			},
		});

		await controller.go("a");
		expect(ctxRef).not.toBeNull();
		expect(destroyed).toEqual([]);

		await controller.go("b");
		expect(destroyed).toEqual(["tracked", "returned"]);
		expect(controller.currentPhase()).toBe("b");
	});

	it("tracks arrays returned by a handler as a single scope", async () => {
		const destroyed: string[] = [];
		const controller = createPhaseController<Phase, Events>({
			name: "test",
			events: makeEvents(),
			phases: {
				a: () => [element(destroyed, "one"), element(destroyed, "two")],
				b: () => undefined,
			},
		});

		await controller.go("a");
		await controller.go("b");
		expect(destroyed).toEqual(["one", "two"]);
	});

	it("disposes listeners registered with ctx.listen() when the phase ends", async () => {
		const events = makeEvents();
		let hits = 0;
		const controller = createPhaseController<Phase, Events>({
			name: "test",
			events,
			phases: {
				a: (ctx) => {
					ctx.listen(events.ping, () => {
						hits += 1;
					});
				},
				b: () => undefined,
			},
		});

		await controller.go("a");
		await events.ping.emit();
		expect(hits).toBe(1);

		await controller.go("b");
		await events.ping.emit();
		expect(hits).toBe(1);
	});

	it("runs exit → destroy → handler → enter in order, without an exit on the first phase", async () => {
		const order: string[] = [];
		const controller = createPhaseController<Phase, Events>({
			name: "test",
			events: makeEvents(),
			phases: {
				a: {
					handler: () => {
						order.push("handler-a");
						return [element(order, "destroy-a")];
					},
					transition: {
						enter: () => {
							order.push("enter-a");
						},
						exit: () => {
							order.push("exit-a");
						},
					},
				},
				b: {
					handler: () => {
						order.push("handler-b");
						return [element(order, "destroy-b")];
					},
					transition: {
						enter: () => {
							order.push("enter-b");
						},
						exit: () => {
							order.push("exit-b");
						},
					},
				},
			},
		});

		await controller.go("a");
		expect(order).toEqual(["handler-a", "enter-a"]);

		order.length = 0;
		await controller.go("b");
		expect(order).toEqual(["exit-a", "destroy-a", "handler-b", "enter-b"]);
		expect(controller.currentPhase()).toBe("b");
	});

	it("serialises transitions — an async teardown completes before the next handler", async () => {
		const order: string[] = [];
		const controller = createPhaseController<Phase, Events>({
			name: "test",
			events: makeEvents(),
			phases: {
				a: () => {
					order.push("handler-a");
					return [
						{
							destroy: () =>
								new Promise<void>((resolve) =>
									setTimeout(() => {
										order.push("teardown-a");
										resolve();
									}, 5)
								),
						},
					];
				},
				b: () => {
					order.push("handler-b");
				},
			},
		});

		// Issue both without awaiting the first: the chain must run the
		// incoming handler only after the outgoing teardown resolves.
		const first = controller.go("a");
		const second = controller.go("b");
		await Promise.all([first, second]);

		expect(order).toEqual(["handler-a", "teardown-a", "handler-b"]);
	});

	it("startPhaseExit() runs the exit early and go() skips it", async () => {
		const order: string[] = [];
		const controller = createPhaseController<Phase, Events>({
			name: "test",
			events: makeEvents(),
			phases: {
				a: {
					handler: () => [element(order, "destroy-a")],
					transition: {
						exit: () => {
							order.push("exit-a");
						},
					},
				},
				b: () => {
					order.push("handler-b");
					return [element(order, "destroy-b")];
				},
			},
		});

		await controller.go("a");
		await controller.startPhaseExit();
		expect(order).toEqual(["exit-a"]);

		await controller.go("b");
		// exit-a ran once (before the switch), then the elements were destroyed.
		expect(order).toEqual(["exit-a", "destroy-a", "handler-b"]);
	});

	it("restorePhaseExit() reverses a pending pre-exit", async () => {
		const order: string[] = [];
		const controller = createPhaseController<Phase, Events>({
			name: "test",
			events: makeEvents(),
			phases: {
				a: {
					handler: () => [element(order, "destroy-a")],
					transition: {
						enter: () => {
							order.push("enter-a");
						},
						exit: () => {
							order.push("exit-a");
						},
					},
				},
				b: () => [element(order, "destroy-b")],
			},
		});

		await controller.go("a");
		order.length = 0;

		await controller.startPhaseExit();
		await controller.restorePhaseExit();
		expect(order).toEqual(["exit-a", "enter-a"]);

		// A later go() runs the exit again (the pre-exit was consumed).
		order.length = 0;
		await controller.go("b");
		expect(order).toEqual(["exit-a", "destroy-a"]);
	});

	it("ignores an unknown phase with a warning", async () => {
		const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
		const controller = createPhaseController<Phase, Events>({
			name: "test",
			events: makeEvents(),
			phases: { a: () => undefined, b: () => undefined },
		});

		await controller.go("nope" as Phase);
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('go("nope") ignored'));
		expect(controller.currentPhase()).toBeNull();
		warn.mockRestore();
	});

	it("keeps the chain alive after a handler throws", async () => {
		const order: string[] = [];
		const controller = createPhaseController<Phase, Events>({
			name: "test",
			events: makeEvents(),
			phases: {
				a: () => {
					throw new Error("boom");
				},
				b: () => {
					order.push("handler-b");
				},
			},
		});

		await expect(controller.go("a")).rejects.toThrow("boom");
		await controller.go("b");
		expect(order).toEqual(["handler-b"]);
		expect(controller.currentPhase()).toBe("b");
	});

	it("destroy() tears down the active phase and ignores later transitions", async () => {
		const destroyed: string[] = [];
		const events = makeEvents();
		let hits = 0;
		let ctxRef: PhaseContext<Phase, Events> | null = null;
		const controller = createPhaseController<Phase, Events>({
			name: "test",
			events,
			phases: {
				a: (ctx) => {
					ctxRef = ctx;
					ctx.listen(events.ping, () => {
						hits += 1;
					});
					return [element(destroyed, "a")];
				},
				b: () => [element(destroyed, "b")],
			},
		});

		await controller.go("a");
		expect(ctxRef).not.toBeNull();
		controller.destroy();
		// destroy() is synchronous but teardown is awaited per element.
		await Promise.resolve();
		await Promise.resolve();

		expect(destroyed).toEqual(["a"]);
		await events.ping.emit();
		expect(hits).toBe(0);

		await controller.go("b");
		expect(destroyed).toEqual(["a"]);
	});
});

describe("EventRecord", () => {
	it("accepts an event catalog without erasing payload types", () => {
		const events = { typed: createEvent<{ count: number }>() };
		const record: EventRecord = events;
		expect(typeof record.typed.clear).toBe("function");
	});
});
