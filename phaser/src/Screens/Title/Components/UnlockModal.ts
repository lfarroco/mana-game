import * as c from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as Chara from "@Systems/Chara/Chara";
import * as Card from "@game/Entities/Card";
import * as createDescription from "@Systems/Chara/createDescription";
import * as Modal from "@Components/Modal/Modal";
import * as i18n from "@i18n/i18n";
import { env } from "../../../Env";

const PANEL_WIDTH = 1100;
const PANEL_HEIGHT = 700;

export const render = (unitId: string) =>
	new Promise<void>(async (resolve) => {
		const unitData = Card.getCardDefinition(unitId);

		const modal = Modal.createModal({
			width: PANEL_WIDTH,
			height: PANEL_HEIGHT,
			title: "NEW UNIT UNLOCKED!",
		});

		const dummy = Card.createUnitFromCardSpec("dummy", unitData, undefined, "");

		const chara = await Chara.create(dummy);

		chara.setPosition(0, -180);

		const { title, description } = createDescription.createDescription(chara);

		const titleText = env.scene
			.add.text(0, chara.y + 180, title, c.titleTextConfig)
			.setOrigin(0.5);

		const unlockConditionText = env.scene
			.add.text(0, titleText.y + 35, i18n.t(`unlock_description.${unitId}`), {
				fontFamily: "Arimo",
				fontSize: "20px",
				color: "#ffff00",
				align: "center",
			})
			.setOrigin(0.5);

		const descriptionText = env.scene
			.add.rexBBCodeText(0, unlockConditionText.y + 40, description)
			.setFontSize(30)
			.setWrapMode(1)
			.setFontFamily("Arimo")
			.setOrigin(0.5, 0);

		const confirmButton = UIButton.create({
			text: i18n.t("title.unlock_modal.confirm"),
			position: [0, descriptionText.y + descriptionText.height + 60],
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
