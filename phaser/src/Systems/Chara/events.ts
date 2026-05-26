import * as Shop from "@Screens/Battleground/Shop";;

export const onDiscard = (unitId: string) => {
	Shop.events.ownedUnitSold(unitId);
};
