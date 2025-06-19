import { images } from "../../../../assets";
import * as Card from "../../../../Models/Entities/Card";
import { vec2 } from "../../../../Models/Geometry";
import { Flyout } from "../../../../UI/Flyout";
import { registerChara } from "../CharaManager";
import { RelicCard } from "../Relic";
import { Chara, CharaOptions } from "../../../../Systems/Chara/Chara";
import { BattlegroundScene } from "../../BattlegroundScene";
import { playerForce } from "../../../../Models/Entities/Force";
import { GameEvents } from "../../../../constants/events";
import * as c from "../../../../constants/constants";
import { UIButton } from "../../../../UI/UIButton";
import { makeUnit } from "../../../../Models/Entities/Unit";
import * as sc from "./ShopConstants";

export class ShopUI {
	scene: BattlegroundScene;
	flyout: Flyout;

	constructor(scene: BattlegroundScene, flyout: Flyout) {
		this.scene = scene;
		this.flyout = flyout;
	}

	/**
	 * Clears and re-renders only the character cards in the tavern section of the shop.
	 * Assumes the tavern background and title are already present and should not be recreated.
	 * This method is called when the player rerolls the tavern.
	 * @param cardDefs The new card definitions to display in the tavern.
	 * @param charaPurchaseFinalized Callback function invoked when a character is successfully purchased from the tavern.
	 *                               This allows the `Shop` class to update its list of `currentShopCharas`.
	 * @returns An array of the newly created `Chara` instances that are now displayed in the tavern.
	 */
	rerenderTavernCharas(
		cardDefs: Card.CardDefinition[],
		charaPurchaseFinalized: (purchasedChara: Chara) => void
	): Chara[] {
		const newCharas = this._renderTavernCharas(cardDefs, charaPurchaseFinalized);
		return newCharas;
	}
	displayShop(
		relicDefsToDisplay: Card.RelicDefinition[],
		cardsToDisplay: Card.CardDefinition[],
		nextRoundCallback: () => void,
		rerollCallback: () => void,
		charaPurchaseFinalized: (purchasedChara: Chara) => void,
		relicAcquisitionFinalized: (acquiredRelicCard: RelicCard) => void
	): { charas: Chara[], relicCards: RelicCard[] } {
		this.flyout.removeAll(true); // Clear any previous content

		const panelPadding = 25;
		// Calculate width based on combined relic and tavern sections plus padding
		const shopPanelWidth = sc.RELIC_SECTION_X + sc.TAVERN_BG_OFFSET_X + sc.TAVERN_BG_WIDTH + panelPadding;
		// Calculate height based on the taller of the relic or tavern content areas
		const contentMaxY = Math.max(
			sc.RELIC_SECTION_Y + sc.RELIC_BG_HEIGHT, // Bottom of relic content
			sc.RELIC_SECTION_Y + sc.TAVERN_BG_HEIGHT // Bottom of tavern content (assuming same Y start for logical grouping)
		);
		const buttonAreaHeight = 100;
		const shopPanelHeight = contentMaxY + buttonAreaHeight + panelPadding;

		const shopBackground = this.scene.add.graphics()
			.fillStyle(sc.PANEL_BG_COLOR, sc.PANEL_BG_OPACITY)
			.fillRoundedRect(sc.PANEL_X, sc.PANEL_Y, shopPanelWidth, shopPanelHeight, 20);
		this.flyout.add(shopBackground);
		const displayedRelics = this._renderRelicsUI(relicDefsToDisplay, relicAcquisitionFinalized);
		const displayedCharas = this._renderTavernUI(cardsToDisplay, charaPurchaseFinalized);

		const buttonY = sc.PANEL_Y + shopPanelHeight - 100;
		const nextRoundButtonX = sc.PANEL_X + shopPanelWidth - 130; // Assuming this positions center of button 100px from right
		// Estimate button width + spacing to position reroll button to the left
		const rerollButtonX = nextRoundButtonX - 270; // Adjust this offset as needed for desired spacing and button width

		const rerollBtn = new UIButton(
			this.scene,
			`Reroll $${c.SHOP_ITEM_PURCHASE_COST}`,
			rerollButtonX,
			buttonY,
			rerollCallback
		);
		this.flyout.add(rerollBtn);

		const nextRoundBtn = new UIButton(
			this.scene,
			"Next Round",
			nextRoundButtonX,
			buttonY,
			nextRoundCallback
		);
		this.flyout.add(nextRoundBtn);

		return { charas: displayedCharas, relicCards: displayedRelics };
	}

	_renderRelicsUI(
		relicDefs: Card.RelicDefinition[],
		relicAcquisitionFinalized: (acquiredRelicCard: RelicCard) => void
	): RelicCard[] {
		const createdRelicCards: RelicCard[] = [];

		const bg = this.scene.add.graphics()
			.fillStyle(0x000, 0.5)
			.fillRect(0, 0, sc.RELIC_BG_WIDTH, sc.RELIC_BG_HEIGHT)
			.setPosition(sc.RELIC_SECTION_X, sc.RELIC_SECTION_Y);

		const title = this.scene.add.text(sc.RELIC_TITLE_X, sc.RELIC_TITLE_Y, "Relics", c.titleTextConfig);
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

	/**
	 * Renders the tavern section of the shop, including its background, title, and character cards.
	 * This method is called during the initial display of the shop.
	 * @param cardDefs An array of `Card.CardDefinition` objects representing the characters to display.
	 * @param charaPurchaseFinalized Callback function invoked when a character is successfully purchased.
	 * @returns An array of the created `Chara` instances.
	 */
	_renderTavernUI(
		cardDefs: Card.CardDefinition[],
		charaPurchaseFinalized: (purchasedChara: Chara) => void
	): Chara[] {
		this._renderTavernSectionBackgroundAndTitle();
		return this._renderTavernCharas(cardDefs, charaPurchaseFinalized);
	}

	_renderTavernSectionBackgroundAndTitle(): void {

		const position = [
			sc.RELIC_SECTION_X, sc.RELIC_SECTION_Y
		] as [number, number];
		const bgOffset = [
			sc.TAVERN_BG_OFFSET_X, 0,
		] as [number, number];
		const size = [
			sc.TAVERN_BG_WIDTH, sc.TAVERN_BG_HEIGHT
		] as [number, number];

		const bg = this.scene.add.graphics()
			.fillStyle(0x000, 0.5)
			.fillRect(
				...bgOffset,
				...size,
			)
			.setPosition(...position);

		const titlePositon = [
			sc.TAVERN_TITLE_X, sc.TAVERN_TITLE_Y
		] as [number, number];

		const title = this.scene.add.text(
			...titlePositon,
			"Tavern",
			c.titleTextConfig
		);

		this.flyout.add([bg, title]);
	}

	_renderTavernCharas(
		cardDefs: Card.CardDefinition[],
		charaPurchaseFinalized: (purchasedChara: Chara) => void
	): Chara[] {
		const createdCharas: Chara[] = [];
		cardDefs.forEach((spec, index) => {
			const unit = makeUnit(c.FORCE_ID_PLAYER, spec.id, vec2(0, 0)); // Position is relative to flyout, set later
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