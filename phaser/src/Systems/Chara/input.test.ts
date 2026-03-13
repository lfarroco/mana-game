import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockTween = jest.fn();
const mockItemClickPurchaseRequested = jest.fn();
const mockOnCharaPointerOver = jest.fn();
const mockOnCharaPointerOut = jest.fn();
const mockGetCurrentScene = jest.fn();
const mockIsShopItem = jest.fn();
const mockGetUnit = jest.fn();

jest.mock("@Utils/animation", () => ({
	tween: (...args: unknown[]) => mockTween(...args),
}));

jest.mock("@Systems/Shop", () => ({
	events: {
		itemClickPurchaseRequested: (...args: unknown[]) => mockItemClickPurchaseRequested(...args),
	},
}));

jest.mock("@Models/Board", () => ({
	isInputEnabled: () => true,
}));

jest.mock("@Components/Tooltip", () => ({
	hideTooltip: jest.fn(),
}));

jest.mock("@Systems/Chara/events", () => ({
	onDiscard: jest.fn(),
}));

jest.mock("@Systems/Chara/CharaTooltip", () => ({
	onCharaPointerOver: (...args: unknown[]) => mockOnCharaPointerOver(...args),
	onCharaPointerOut: (...args: unknown[]) => mockOnCharaPointerOut(...args),
}));

jest.mock("@Systems/Chara/Chara", () => ({
	isShopItem: (...args: unknown[]) => mockIsShopItem(...args),
	getUnit: (...args: unknown[]) => mockGetUnit(...args),
}));

jest.mock("@Models/State", () => ({
	getCurrentScene: () => mockGetCurrentScene(),
	getState: jest.fn(),
}));

jest.mock("@Systems/Shop/DiscardZone", () => ({
	name: "discard-zone",
	hide: jest.fn(),
	show: jest.fn(),
}));

jest.mock("@PhaserIO", () => ({
	WhenDroppedOnZone: jest.fn(),
}));

jest.mock("@Systems/Shop/ShopPanel", () => ({
	bringChildToTop: jest.fn(),
}));

jest.mock("@Core/GameControllerFactory", () => ({
	getGameController: jest.fn(),
}));

import { onPointerDown, onPointerUp, onPointerUpShopItem } from "@Systems/Chara/input";
import * as constants from "@Constants/constants";

describe("Chara input handlers", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockIsShopItem.mockReturnValue(false);
	});

	it("schedules long-press tooltip on touch devices", () => {
		const delayedCall = jest.fn().mockReturnValue({ destroy: jest.fn() });
		const chara = { id: "chara-1" };
		const handlerState = {
			wasDragSuccessful: false,
			chara,
			unitId: "unit-1",
			isLongPressActive: false,
		};

		mockGetCurrentScene.mockReturnValue({
			sys: { game: { device: { input: { touch: true } } } },
			time: { delayedCall },
		});

		onPointerDown(handlerState as never)({} as never);

		expect(delayedCall).toHaveBeenCalledWith(expect.any(Number), expect.any(Function));
		expect(delayedCall.mock.calls[0][0]).toBe(200);

		const callback = delayedCall.mock.calls[0][1] as () => void;
		callback();

		expect(handlerState.isLongPressActive).toBe(true);
		expect(mockOnCharaPointerOver).toHaveBeenCalledWith(chara);
	});

	it("skips long-press setup on non-touch devices", () => {
		const delayedCall = jest.fn();
		const handlerState = {
			wasDragSuccessful: false,
			chara: { id: "chara-1" },
			unitId: "unit-1",
			isLongPressActive: false,
		};

		mockGetCurrentScene.mockReturnValue({
			sys: { game: { device: { input: { touch: false } } } },
			time: { delayedCall },
		});

		onPointerDown(handlerState as never)({} as never);

		expect(delayedCall).not.toHaveBeenCalled();
	});

	it("clears active long-press tooltip on pointer up for owned units", () => {
		const destroy = jest.fn();
		const handlerState = {
			wasDragSuccessful: false,
			chara: { id: "chara-1" },
			unitId: "unit-1",
			longPressTimer: { destroy },
			isLongPressActive: true,
		};

		mockIsShopItem.mockReturnValue(false);

		onPointerUp(handlerState as never)({} as never);

		expect(destroy).toHaveBeenCalled();
		expect(handlerState.longPressTimer).toBeUndefined();
		expect(handlerState.isLongPressActive).toBe(false);
		expect(mockOnCharaPointerOut).toHaveBeenCalled();
	});

	it("ignores click-purchase when drag distance exceeds threshold", () => {
		const chara = {
			input: { enabled: true },
			getData: jest.fn(),
			x: 10,
			y: 20,
		};
		const handlerState = {
			wasDragSuccessful: false,
			chara,
			unitId: "shop-unit-1",
			isLongPressActive: false,
		};

		mockIsShopItem.mockReturnValue(true);

		onPointerUpShopItem(handlerState as never)({
			getDistance: () => constants.DRAG_CLICK_THRESHOLD + 1,
			x: 10,
			y: 20,
		} as never);

		expect(mockItemClickPurchaseRequested).not.toHaveBeenCalled();
	});

	it("snaps shop items back instead of purchasing after long press", () => {
		const dragStartVec = { x: 4, y: 8 };
		const chara = {
			input: { enabled: true },
			getData: jest.fn().mockReturnValue(dragStartVec),
			x: 10,
			y: 20,
		};
		const handlerState = {
			wasDragSuccessful: false,
			chara,
			unitId: "shop-unit-1",
			isLongPressActive: true,
		};

		mockIsShopItem.mockReturnValue(true);

		onPointerUpShopItem(handlerState as never)({
			getDistance: () => 0,
			x: 10,
			y: 20,
		} as never);

		expect(handlerState.isLongPressActive).toBe(false);
		expect(mockTween).toHaveBeenCalledWith({
			targets: [chara],
			x: 4,
			y: 8,
			duration: 150,
		});
		expect(mockItemClickPurchaseRequested).not.toHaveBeenCalled();
	});

	it("forwards short shop-item clicks to the purchase event handler", () => {
		const unit = { id: "shop-unit-1", cardId: "mana_crystal" };
		const chara = {
			input: { enabled: true },
			getData: jest.fn(),
			x: 33,
			y: 44,
		};
		const handlerState = {
			wasDragSuccessful: false,
			chara,
			unitId: unit.id,
			isLongPressActive: false,
		};

		mockIsShopItem.mockReturnValue(true);
		mockGetUnit.mockReturnValue(unit);

		onPointerUpShopItem(handlerState as never)({
			getDistance: () => 0,
			x: 99,
			y: 101,
		} as never);

		expect(mockItemClickPurchaseRequested).toHaveBeenCalledTimes(1);
		const [forwardedUnit, forwardedId, forwardedX, forwardedY] =
			mockItemClickPurchaseRequested.mock.calls[0];
		expect(forwardedUnit).toEqual(unit);
		expect(forwardedUnit).not.toBe(unit);
		expect(forwardedId).toBe(unit.id);
		expect(forwardedX).toBe(33);
		expect(forwardedY).toBe(44);
	});
});
