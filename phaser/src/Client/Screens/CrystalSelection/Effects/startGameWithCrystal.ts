import * as io from "@PhaserIO";
import * as _ from "../CrystalSelectionScene";
export async function startGameWithCrystal() {
	const selectedCrystal = _.state.crystals[_.state.currentIndex];

	await io.FadeOut(300, 0x000000);

	io.scene.children.removeAll();

	io.screens.battleground({
		selectedCrystalId: selectedCrystal.id,
		// only local for now
		sessionType: { type: "local" },
	});

	await io.FadeIn(300);
}
