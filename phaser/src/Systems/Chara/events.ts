import * as Shop from "@Screens/Battleground/Components/Shop";;

export const onDiscard = (unitId: string) => {
	Shop.events.ownedUnitSold(unitId);
};
