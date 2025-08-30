import { handleUserMessageRequested } from "../UI";


export function onPurchaseFailed(payload: { unitName: string; reason: string; cost?: number; }): void {
	let message = `Could not buy ${payload.unitName}. `;
	switch (payload.reason) {
		case "PARTY_FULL":
			message += "Your party is full!";
			break;
		case "INSUFFICIENT_GOLD":
			message += `Not enough gold! (Cost: ${payload.cost ?? 'N/A'})`;
			break;
		case "SLOT_OCCUPIED":
			message += "That slot is already occupied.";
			break;
		default: message += "Reason unknown.";
	}
	handleUserMessageRequested({ text: message, type: 'error' });

}
