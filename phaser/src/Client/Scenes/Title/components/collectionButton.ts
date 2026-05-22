import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { showCollectionModal } from "Client/Scenes/Title/components/CollectionModal";
import { t } from "@i18n/i18n";
import { MIDDLE_SCREEN_X } from "@Constants/constants";

export function collectionButton(y: number) {
	return createUIButton(
		t("title.collection"), // "COLLECTION"
		vec2(MIDDLE_SCREEN_X, y),
		() => {
			showCollectionModal();
		}
	);
}
