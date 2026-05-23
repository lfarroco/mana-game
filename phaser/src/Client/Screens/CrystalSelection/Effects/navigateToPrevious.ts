import * as _ from "../CrystalSelectionScene";
import { updateDisplay } from "./updateDisplay";


export function navigateToPrevious() {
	_.state.currentIndex = (_.state.currentIndex - 1 + _.state.crystals.length) % _.state.crystals.length;
	updateDisplay();
}
