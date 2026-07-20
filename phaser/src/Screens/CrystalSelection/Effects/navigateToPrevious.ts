import * as parent from "../CrystalSelectionScreen";
import * as updateDisplay from "./updateDisplay";


export function navigateToPrevious() {

	const { currentIndex, crystals } = parent.state;

	parent.state.currentIndex = (currentIndex - 1 + crystals.length) % crystals.length;

	updateDisplay.updateDisplay();
}
