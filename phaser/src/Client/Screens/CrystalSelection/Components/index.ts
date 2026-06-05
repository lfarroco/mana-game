import * as paginationDots from "./paginationDots";
import * as crystalDisplay from "./crystalDisplay";
import * as navigationButtons from "./navigationButtons";
import * as actionButtons from "./actionButtons";
import * as seedInput from "./seedInput";
import * as background from "./background";
import * as title from "./title";

export function create() {
	[
		paginationDots,
		crystalDisplay,
		navigationButtons,
		actionButtons,
		seedInput,
		background,
		title
	].forEach(c => c.create());
}