import * as paginationDots from "./Components/paginationDots";
import * as crystalDisplay from "./Components/crystalDisplay";
import * as navigationButtons from "./Components/navigationButtons";
import * as actionButtons from "./Components/actionButtons";
import * as seedInput from "./Components/seedInput";
import * as background from "./Components/background";
import * as title from "./Components/title";
import { ClientState } from "@Models/ClientState";

export function create(clientState: ClientState) {
	[
		background,
		paginationDots,
		crystalDisplay,
		navigationButtons,
		actionButtons,
		seedInput,
		title
	].forEach(c => c.create(clientState));
}