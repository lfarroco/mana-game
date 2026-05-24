import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { showCollectionModal } from "Client/Screens/Title/Components/CollectionModal";
import { t } from "@i18n/i18n";
import { MIDDLE_SCREEN_X } from "@Constants/constants";

export function collectionButton(y: number) {
	return createUIButton({
		text: t("title.collection"),
		position: vec2(MIDDLE_SCREEN_X, y),
		callback: () => {
			showCollectionModal();
		},
	});
}
