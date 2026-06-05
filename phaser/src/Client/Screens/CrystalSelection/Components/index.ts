import * as paginationDots from "./PaginationDots";
import * as crystalDisplay from "./CrystalDisplay";
import * as navigationButtons from "./NavigationButtons";
import * as actionButtons from "./ActionButtons";
import * as seedInput from "./seedInput";
import * as background from "./Background";
import * as title from "./Title";

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