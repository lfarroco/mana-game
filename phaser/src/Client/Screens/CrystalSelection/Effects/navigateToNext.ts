import * as _ from "../CrystalSelectionScene";
import * as updateDisplay from "./updateDisplay";


export function navigateToNext() {
	_.state.currentIndex = (_.state.currentIndex + 1) % _.state.crystals.length;
	updateDisplay.updateDisplay();
}
