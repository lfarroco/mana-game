import * as ShopUI from "./ShopUI";
import * as MoraleDisplay from "../../MoraleDisplay";

export function init() {
	ShopUI.create();
	MoraleDisplay.init();
}

export async function close() {
	ShopUI.destroyOrbs();
	await ShopUI.slideOut();
}