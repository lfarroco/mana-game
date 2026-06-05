import * as Background from "./Background";
import * as NamesDisplay from "./UI/namesDisplay";
import * as ResultsUI from "./Results/ResultsUI";
import * as Board from "@Models/Board";
import * as UI from "./UI/UI";
import * as Shop from "./Shop/ShopPanel";
import * as DiscardZone from "./Shop/DiscardZone";

export function create() {
	[
		Background,
		NamesDisplay,
		Board,
		ResultsUI,
		DiscardZone,
		UI,
		Shop
	].forEach(c => c.create());
}