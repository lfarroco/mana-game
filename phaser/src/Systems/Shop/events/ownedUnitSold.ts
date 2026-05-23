import * as Chara from "@Systems/Chara/Chara";
import * as DiscardZone from "@Systems/Shop/DiscardZone";
import * as GameControllerFactory from "@Core/GameControllerFactory";

/**
 * Handle a unit sale request
 *
 * This function has been refactored to use the event-driven architecture:
 * 1. Use pure functions to determine what should happen
 * 2. Call the GameController for server validation TODO: this should be pure and #1
 * 3. Emit events for the Visualizer to handle visual updates
 */
export function ownedUnitSold(unitId: string) {

	// Step 1: Call the GameController to handle the unit sale on server
	const controller = GameControllerFactory.getGameController();
	controller.sellUnit(unitId);

	// Step 2: Update game state - remove unit from state
	state.currentState.session.team.units =
		state.currentState.session.team.units
			.filter((u) => u.id !== unitId);

	// Step 3: Handle immediate visual cleanup
	const chara = Chara.getCharaById(unitId);
	chara?.destroy();
	DiscardZone.hide();
}

