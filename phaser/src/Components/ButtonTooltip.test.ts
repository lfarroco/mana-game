import type Phaser from "phaser";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { attachButtonTooltip } from "@Components/ButtonTooltip";

const mockRenderTooltip = jest.fn();
const mockHideTooltip = jest.fn();
const POINTER_OVER = "pointerover";
const POINTER_OUT = "pointerout";
const POINTER_DOWN = "pointerdown";
const POINTER_UP = "pointerup";

jest.mock("@Components/Tooltip", () => ({
	renderTooltip: (...args: unknown[]) => mockRenderTooltip(...args),
	hideTooltip: (...args: unknown[]) => mockHideTooltip(...args),
}));

type Listener = () => void;

class FakeTarget {
	public readonly listeners = new Map<string, Set<Listener>>();
	public readonly scene = {} as Phaser.Scene;

	on(event: string, callback: Listener) {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}
		this.listeners.get(event)?.add(callback);
		return this;
	}

	off(event: string, callback: Listener) {
		this.listeners.get(event)?.delete(callback);
		return this;
	}

	once(event: string, callback: Listener) {
		const wrapped = () => {
			this.off(event, wrapped);
			callback();
		};
		return this.on(event, wrapped);
	}

	emit(event: string) {
		for (const listener of this.listeners.get(event) ?? []) {
			listener();
		}
	}
}

describe("attachButtonTooltip", () => {
	let target: Parameters<typeof attachButtonTooltip>[0];

	beforeEach(() => {
		jest.clearAllMocks();
		target = new FakeTarget() as unknown as Parameters<typeof attachButtonTooltip>[0];
	});

	it("shows the tooltip immediately on hover", () => {
		attachButtonTooltip(target, {
			title: "Single Player",
			description: "Start a solo run.",
		}, () => true, () => ({ x: 240, y: 440 }));

		(target as unknown as FakeTarget).emit(POINTER_OVER);

		expect(mockRenderTooltip).toHaveBeenCalledWith(
			240,
			440,
			"Single Player",
			"Start a solo run.",
			{ anchorX: "center" }
		);
	});

	it("shows the tooltip immediately on pointer down", () => {
		attachButtonTooltip(target, {
			title: "Arena",
			description: "Play online.",
		}, () => true, () => ({ x: 240, y: 440 }));

		(target as unknown as FakeTarget).emit(POINTER_DOWN);

		expect(mockRenderTooltip).toHaveBeenCalledWith(
			240,
			440,
			"Arena",
			"Play online.",
			{ anchorX: "center" }
		);
	});

	it("hides the tooltip on pointer up when not hovered", () => {
		attachButtonTooltip(target, {
			title: "Options",
			description: "Open settings.",
		}, () => true, () => ({ x: 240, y: 440 }));

		(target as unknown as FakeTarget).emit(POINTER_DOWN);
		(target as unknown as FakeTarget).emit(POINTER_UP);

		expect(mockRenderTooltip).toHaveBeenCalledTimes(1);
		expect(mockHideTooltip).toHaveBeenCalled();
	});

	it("hides the tooltip on pointer out", () => {
		attachButtonTooltip(target, {
			title: "Links",
			description: "Open links.",
		}, () => true, () => ({ x: 240, y: 440 }));

		(target as unknown as FakeTarget).emit(POINTER_OVER);
		(target as unknown as FakeTarget).emit(POINTER_OUT);

		expect(mockRenderTooltip).toHaveBeenCalledTimes(1);
		expect(mockHideTooltip).toHaveBeenCalled();
	});
});
