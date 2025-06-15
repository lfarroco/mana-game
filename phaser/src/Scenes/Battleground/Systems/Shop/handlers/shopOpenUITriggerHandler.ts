import { Shop } from "../Shop";

export async function shopOpenUITriggerHandler(shopInstance: Shop): Promise<void> {
	shopInstance.open();
}