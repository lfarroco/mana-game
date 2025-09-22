import * as ShopUI from "./ShopUI";
import * as Systems from "../index"
import * as Board from "@Models/Board";
import { renderOrbs } from "./Orbs";
import { delay } from "../../../../Utils/animation";
import { pickRandom } from "../../../../utils";

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

	const selectedOrbs = pickRandom(availableOrbs, 3);

	const nextRoundCallback = () => {
		Systems.ShopPhase.handleShopPhaseEnded();
		close();
	};

	ShopUI.displayCommonShop(nextRoundCallback, buttonText);

	const shopState = ShopUI.getState();
	if (shopState) {
		renderOrbs(shopState, selectedOrbs, async () => {
			ShopUI.disableNextRoundButton();
			await delay(500);
			Systems.ShopPhase.handleShopPhaseEnded();
			await close();
		});
	}

	Board.setEnemyBoardVisible(false);

	await ShopUI.slideIn();
}

export async function close() {
	await ShopUI.slideOut();
	ShopUI.destroyOrbs();
}

export async function handleShopOpenUITrigger(buttonText: string = "Next Round"): Promise<void> {
	await open(buttonText);
}
