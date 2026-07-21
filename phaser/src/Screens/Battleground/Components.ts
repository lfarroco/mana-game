import * as Background from "./Components/background";
import * as NamesDisplay from "./Components/UI/namesDisplay";
import * as ResultsUI from "./Components/Results/ResultsUI";
import * as Board from "@Components/Board/Board";
import * as UI from "./Components/UI/UI";
import * as Shop from "./Components/Shop/ShopPanel";
import * as DiscardZone from "./Components/Shop/DiscardZone";
import { ClientState } from "@Models/ClientState";

export function create(clientState: ClientState) {
	[
		Background,
		NamesDisplay,
		Board,
		ResultsUI,
		DiscardZone,
	].forEach(c => c.create());
	UI.create(clientState);
	Shop.create();
}