import * as UIButton from "@Components/Button/UIButton";
import * as CollectionModal from "../../../Screens/Title/Components/CollectionModal";
import * as i18n from "@i18n/i18n";
import * as constants from "@Constants";

export function collectionButton(y: number) {
	return UIButton.create({
		text: i18n.t("title.collection"),
		position: [
			constants.MIDDLE_SCREEN_X,
			y,
		],
		callback: CollectionModal.create
	});
}
