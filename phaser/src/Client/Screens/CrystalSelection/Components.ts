import * as paginationDots from "./Components/PaginationDots";
import * as crystalDisplay from "./Components/CrystalDisplay";
import * as navigationButtons from "./Components/NavigationButtons";
import * as actionButtons from "./Components/ActionButtons";
import * as seedInput from "./Components/seedInput";
import * as background from "./Components/Background";
import * as title from "./Components/Title";

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