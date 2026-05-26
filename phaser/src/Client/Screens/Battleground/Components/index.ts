
import * as background from "./background";
import * as namesDisplay from "./UI/namesDisplay";
import * as ResultsUI from "Client/Screens/Battleground/Results/ResultsUI";
import * as DiscardZone from "../Shop/DiscardZone";
import * as Board from "@Models/Board";
import * as UI from "./UI/UI";

export function create() {
	background.createBackground();
	namesDisplay.create();
	Board.init();
	ResultsUI.createResultsUI();
	DiscardZone.create();
	UI.createUI();
}