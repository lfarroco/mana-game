import * as Geometry from "@Models/Geometry";
import * as UIButton from "Client/Components/UIButton";
import * as CollectionModal from "Client/Screens/Title/Components/CollectionModal";
import * as i18n from "@i18n/i18n";
import * as constants from "@Constants/constants";

export function collectionButton(y: number) {
	return UIButton.create({
		text: i18n.t("title.collection"),
		position: Geometry.vec2(constants.MIDDLE_SCREEN_X, y),
		callback: () => {
			CollectionModal.showCollectionModal();
		},
	});
}
