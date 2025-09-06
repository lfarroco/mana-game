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

export async function handleShopOpenUITrigger(): Promise<void> {
	// This function is kept for backward compatibility but delegates to specific shop files
	// The mode parameter is ignored as shops are now handled by their specific files
	console.warn("Shop.handleShopOpenUITrigger is deprecated. Use specific shop files instead.");
}
