
import * as background from "./background";
import * as namesDisplay from "./namesDisplay";
import * as livesDisplay from "./livesDisplay";
import * as menuButton from "./menuButton";
import * as roundDisplay from "./roundDisplay";
import * as winsDisplay from "./winsDisplay";
import * as ResultsUI from "Client/Screens/Battleground/Results/ResultsUI";
import * as DiscardZone from "../Shop/DiscardZone";
import * as Board from "@Models/Board";

export function create() {
	background.createBackground();
	namesDisplay.create();
	livesDisplay.create();
	menuButton.create();
	roundDisplay.create();
	winsDisplay.create();
	Board.init();
	ResultsUI.createResultsUI();
	DiscardZone.create();
}