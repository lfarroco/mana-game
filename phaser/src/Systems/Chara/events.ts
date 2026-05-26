import * as Shop from "@Systems/Shop";

export const onDiscard = (unitId: string) => {
	Shop.events.ownedUnitSold(unitId);
};
