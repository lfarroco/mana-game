import * as ShopUI from "./ShopUI";
import * as Systems from "../index"
import * as Board from "@Models/Board";
import { renderOrbs } from "./Orbs";

export function init() {
	ShopUI.create();
}

export async function open(buttonText: string = "Next Round") {
	const availableOrbs = [
		"crimson_orb",
		"emerald_orb",
		"azure_orb",
		"golden_orb",
		"violet_orb",
		"charge_orb",
		"positional_power_orb",
		"positional_typed_power_orb"
	];

	const nextRoundCallback = () => {
		Systems.ShopPhase.handleShopPhaseEnded();
		close();
	};

	ShopUI.displayCommonShop(nextRoundCallback, buttonText, "Orb Shop");

	const shopState = ShopUI.getState();
	if (shopState) {
		renderOrbs(shopState, availableOrbs);
	}

	Board.setEnemyBoardVisible(false);

	await ShopUI.slideIn();
}

export async function close() {
	await ShopUI.slideOut();
}

export async function handleShopOpenUITrigger(buttonText: string = "Next Round"): Promise<void> {
	await open(buttonText);
}
