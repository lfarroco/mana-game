import { Unit } from "@Models/Entities/Unit";
import { getState } from "@Models/State";
import { getCharaById } from "@Systems/Chara/Chara";
import * as DiscardZone from "@Systems/Shop/DiscardZone";
import { getGameController } from "@Core/GameControllerFactory";
import * as PureShop from "@Systems/Shop/PureShop";
import { emitSystemEvent } from "@Engine/Visualizer";

/**
 * Handle a unit sale request
 *
 * This function has been refactored to use the event-driven architecture:
 * 1. Use pure functions to determine what should happen
 * 2. Call the GameController for server validation
 * 3. Emit events for the Visualizer to handle visual updates
 */
export function ownedUnitSold(unitId: string) {
	const state = getState();

	// Step 1: Call the GameController to handle the unit sale on server
	const controller = getGameController();
	controller.sellUnit(unitId);

	// Step 2: Update game state - remove unit from state
	state.session.team.units = PureShop.removeUnitFromUnits(state.session.team.units, unitId);

	// Step 3: Emit events for visual updates
	const events = PureShop.processSale(state.session, unitId);
	for (const event of events) {
		emitSystemEvent(event);
	}

	// Step 4: Handle immediate visual cleanup
	// Note: In the future, these could also be handled by the Visualizer
	const chara = getCharaById(unitId);
	chara?.destroy();
	DiscardZone.hide();
}

/**
 * Helper function to remove a unit from the player state (kept for backwards compatibility)
 * @deprecated Use PureShop.removeUnitFromUnits instead
 */
export function removeUnitFromPlayerState(units: Unit[], unitId: string): Unit[] {
	return PureShop.removeUnitFromUnits(units, unitId);
}
