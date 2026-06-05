import * as c from "../../../../Constants";
import * as Geometry from "@Models/Geometry";
import * as UIButton from "@Components/Button/UIButton";
import * as Card from "@Models/Entities/Card";
import * as Chara from "@Systems/Chara/Chara";
import * as Unit from "@Models/Entities/Unit";
import * as createDescription from "@Systems/Chara/createDescription";
import * as Modal from "@Components/Modal/Modal";
import * as i18n from "@i18n/i18n";

const PANEL_WIDTH = 1100;
const PANEL_HEIGHT = 700;

export function render(unitId: string): Promise<void> {
	return new Promise(async (resolve) => {
		const unitData = Card.getCardDefinition(unitId);

		const modal = Modal.createModal({
			width: PANEL_WIDTH,
			height: PANEL_HEIGHT,
			title: "NEW UNIT UNLOCKED!",
		});

		const dummy = Unit.createUnitFromCardSpec("dummy", unitData, undefined, "");

		const chara = await Chara.create(dummy);

		chara.setPosition(0, -180);

		const { title, description } = createDescription.createDescription(chara);

		const titleText = io.scene
			.add.text(0, chara.y + 180, title, c.titleTextConfig)
			.setOrigin(0.5);

		const unlockConditionText = io.scene
			.add.text(0, titleText.y + 35, i18n.t(`unlock_description.${unitId}`), {
				fontFamily: "Arimo",
				fontSize: "20px",
				color: "#ffff00",
				align: "center",
			})
			.setOrigin(0.5);

		const descriptionText = io.scene
			.add.rexBBCodeText(0, unlockConditionText.y + 40, description)
			.setFontSize(30)
			.setWrapMode(1)
			.setFontFamily("Arimo")
			.setOrigin(0.5, 0);

		const confirmButton = UIButton.create({
			text: i18n.t("title.unlock_modal.confirm"),
			position: Geometry.vec2(0, descriptionText.y + descriptionText.height + 60),
			callback: () => {
				modal.close();
			},
		});

		modal.container.add([
			chara,
			titleText,
			unlockConditionText,
			descriptionText,
			confirmButton.container,
		]);

		await modal.onClose;
		resolve();
	});
}
