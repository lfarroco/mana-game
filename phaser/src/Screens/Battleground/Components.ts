import * as Background from "./Components/background";
import * as NamesDisplay from "./Components/UI/namesDisplay";
import * as ResultsUI from "./Components/Results/ResultsUI";
import * as Board from "@Components/Board/Board";
import * as UI from "./Components/UI/UI";
import * as Shop from "./Components/Shop/ShopPanel";
import * as DiscardZone from "./Components/Shop/DiscardZone";

export function create() {
	[
		Background,
		NamesDisplay,
		Board,
		ResultsUI,
		DiscardZone,
	].forEach(c => c.create());
	UI.create();
	Shop.create();
}