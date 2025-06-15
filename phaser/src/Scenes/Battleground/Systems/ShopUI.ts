import { images } from "../../../assets";
import * as Card from "../../../Models/Entities/Card";
import { vec2 } from "../../../Models/Geometry";
import { Flyout } from "../../../UI/Flyout";
import { registerChara } from "./CharaManager";
import { RelicCard } from "./Relic";
import { Chara, CharaOptions } from "../../../Systems/Chara/Chara";
import { BattlegroundScene } from "../BattlegroundScene";
import { playerForce } from "../../../Models/Entities/Force";
import { GameEvents } from "../../../constants/events";
import * as constants from "../../../constants/constants";
import { UIButton } from "../../../UI/UIButton";
import { makeUnit } from "../../../Models/Entities/Unit";
import * as sc from "./ShopConstants";

export class ShopUI {
	private scene: BattlegroundScene;
	private flyout: Flyout;

	constructor(scene: BattlegroundScene, flyout: Flyout) {
		this.scene = scene;
		this.flyout = flyout;
	}

	public displayShop(
		relicDefsToDisplay: Card.RelicDefinition[],
		cardsToDisplay: Card.CardDefinition[],
		nextRoundCallback: () => void,
		charaPurchaseFinalized: (purchasedChara: Chara) => void,
		relicAcquisitionFinalized: (acquiredRelicCard: RelicCard) => void
	): { charas: Chara[], relicCards: RelicCard[] } {
		this.flyout.removeAll(true); // Clear any previous content

		const panelPadding = 25;
		const shopPanelWidth = sc.RELIC_SECTION_X + sc.TAVERN_BG_OFFSET_X + sc.TAVERN_BG_WIDTH + panelPadding;
		const contentHeight = sc.RELIC_SECTION_Y + sc.RELIC_BG_HEIGHT;
		const buttonAreaHeight = 100;
		const shopPanelHeight = contentHeight + buttonAreaHeight + panelPadding;

		const shopBackground = this.scene.add.graphics()
			.fillStyle(sc.PANEL_BG_COLOR, sc.PANEL_BG_OPACITY)
			.fillRoundedRect(sc.PANEL_X, sc.PANEL_Y, shopPanelWidth, shopPanelHeight, 20);
		this.flyout.add(shopBackground);

		const displayedRelics = this._renderRelicsUI(relicDefsToDisplay, relicAcquisitionFinalized);
		const displayedCharas = this._renderTavernUI(cardsToDisplay, charaPurchaseFinalized);

		const nextRoundBtn = new UIButton(
			this.scene,
			"Next Round",
			sc.PANEL_X + shopPanelWidth - 100,
			sc.PANEL_Y + shopPanelHeight - 40,
			nextRoundCallback
		);
		this.flyout.add(nextRoundBtn);

		return { charas: displayedCharas, relicCards: displayedRelics };
	}

	private _renderRelicsUI(
		relicDefs: Card.RelicDefinition[],
		relicAcquisitionFinalized: (acquiredRelicCard: RelicCard) => void
	): RelicCard[] {
		const createdRelicCards: RelicCard[] = [];

		const bg = this.scene.add.graphics()
			.fillStyle(0x000, 0.5)
			.fillRect(0, 0, sc.RELIC_BG_WIDTH, sc.RELIC_BG_HEIGHT)
			.setPosition(sc.RELIC_SECTION_X, sc.RELIC_SECTION_Y);

		const title = this.scene.add.text(sc.RELIC_TITLE_X, sc.RELIC_TITLE_Y, "Relics", constants.titleTextConfig);
		this.flyout.add([bg, title]);

		relicDefs.forEach((relic, index) => {
			const x = sc.RELIC_FIRST_ICON_X + (index * sc.RELIC_ICON_SPACING);
			const y = sc.RELIC_ICON_BASE_Y;

			const slot = this.scene.add
				.image(x, y, images.slot.key)
				.setDisplaySize(sc.RELIC_ICON_SIZE, sc.RELIC_ICON_SIZE);

			const icon = new RelicCard(
				this.scene, x, y,
				playerForce.id, relic,
				sc.RELIC_ICON_SIZE - 40,
				() => { // onAcquire callback
					this.flyout.remove(icon); // Remove from flyout display
					relicAcquisitionFinalized(icon); // Notify Shop class
				}
			);

			this.flyout.add([slot, icon]);
			createdRelicCards.push(icon);
		});
		return createdRelicCards;
	}

	private _renderTavernUI(
		cardDefs: Card.CardDefinition[],
		charaPurchaseFinalized: (purchasedChara: Chara) => void
	): Chara[] {
		const createdCharas: Chara[] = [];

		const bg = this.scene.add.graphics()
			.fillStyle(0x000, 0.5)
			.fillRect(sc.TAVERN_BG_OFFSET_X, 0, sc.TAVERN_BG_WIDTH, sc.TAVERN_BG_HEIGHT)
			.setPosition(sc.RELIC_SECTION_X, sc.RELIC_SECTION_Y);

		const title = this.scene.add.text(sc.TAVERN_TITLE_X, sc.TAVERN_TITLE_Y, "Tavern", constants.titleTextConfig);
		this.flyout.add([bg, title]);

		cardDefs.forEach((spec, index) => {
			const unit = makeUnit(constants.FORCE_ID_PLAYER, spec.id, vec2(0, 0)); // Position is relative to flyout, set later
			const charaOptions: CharaOptions = {
				isShopItem: true,
				onPurchased: () => { // Called by Chara.finalizePurchase
					this.scene.events.emit(GameEvents.TOOLTIP_HIDE);
					this.flyout.remove(chara); // Remove from flyout display
					// The Chara instance itself will be destroyed by CharaManager via event.
					// We call charaPurchaseFinalized to let Shop update its internal list.
					charaPurchaseFinalized(chara);
				}
			};
			const chara = new Chara(this.scene, unit, charaOptions);
			registerChara(chara); // Register with CharaManager

			chara.setPosition(sc.TAVERN_CHARA_FIRST_X + (index * sc.TAVERN_CHARA_SPACING), sc.TAVERN_CHARA_BASE_Y);
			chara.setBarsVisibility(false);

			this.flyout.add(chara);
			createdCharas.push(chara);
		});
		return createdCharas;
	}
}