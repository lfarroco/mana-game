import { getAllCards } from "@Models/Entities/Card";
import { createUnitFromCardSpec } from "@Models/Entities/Unit";
import * as Chara from "@Systems/Chara/Chara";
import { createModal } from "@Components/Modal";
import { createUIButton } from "@Components/UIButton";
import { vec2 } from "@Models/Geometry";
import * as io from "@PhaserIO";
import { t } from "@i18n/i18n";
import * as StatsStore from "@Models/StatsStore";
import { hideTooltip, renderTooltip } from "@Components/Tooltip";
import { createDescription } from "@Systems/Chara/createDescription";

const PANEL_WIDTH = 1200;
const PANEL_HEIGHT = 900;
const COLS = 5;
const ROWS = 2;
const CARDS_PER_PAGE = ROWS * COLS;

type Tab = "unlocked" | "locked";

export function showCollectionModal(): Promise<void> {
	return new Promise((resolve) => {
		const modal = createModal({
			width: PANEL_WIDTH,
			height: PANEL_HEIGHT,
			title: t("title.collection_modal.title"), // "COLLECTION"
		});

		const allCards = getAllCards().filter(c => !c.isCore && c.id !== "dummy" && c.id !== "dummy_card");

		let currentTab: Tab = "unlocked";
		let currentPage = 0;
		const charas: Chara.Chara[] = [];
		let displayCards = getCardsForTab(currentTab);
		let isLoading = false;

		const charaContainer = io.Container();
		modal.container.add(charaContainer);

		function getCardsForTab(tab: Tab) {
			return allCards.filter(c => {
				const isUnlocked = !c.locked || StatsStore.isUnitUnlocked(c.id);
				return tab === "unlocked" ? isUnlocked : !isUnlocked;
			});
		}

		function getTotalPages() {
			return Math.max(1, Math.ceil(displayCards.length / CARDS_PER_PAGE));
		}

		const renderPage = async (pageIndex: number) => {
			isLoading = true;
			try {
				// Cleanup previous charas
				charas.forEach(c => Chara.destroy(c));
				charas.length = 0;
				charaContainer.removeAll(true);

				const startIdx = pageIndex * CARDS_PER_PAGE;
				const endIdx = Math.min(startIdx + CARDS_PER_PAGE, displayCards.length);
				const pageCards = displayCards.slice(startIdx, endIdx);

				const cellWidth = PANEL_WIDTH / COLS;
				// Use a more generous cell height or spacing
				const cellHeight = 300;
				const startX = -PANEL_WIDTH / 2 + cellWidth / 2;
				const startY = -PANEL_HEIGHT / 2 + cellHeight / 2 + 120; // Offset for tabs

				for (let i = 0; i < pageCards.length; i++) {
					const card = pageCards[i];
					const col = i % COLS;
					const row = Math.floor(i / COLS);

					// Unique ID for dummy unit to avoid conflicts
					const dummyId = `collection_dummy_${card.id}_${pageIndex}`;
					// Use "NEUTRAL" force to avoid drag logic in input.ts (checks for PLAYER)
					const dummyUnit = createUnitFromCardSpec(dummyId, card, undefined, "NEUTRAL");

					// Create chara
					const chara = await Chara.create(dummyUnit);
					// Check if locked
					const isUnlocked = !card.locked || StatsStore.isUnitUnlocked(card.id);
					if (!isUnlocked) {
						const sprite = Chara.mustGetState(chara).sprite;
						sprite.preFX?.addColorMatrix().grayscale(1);

						const unlockDescKey = `unlock_description.${card.id}`;
						const unlockDesc = t(unlockDescKey);

						chara.on(Phaser.Input.Events.POINTER_OVER, () => {
							const { title, description: normalDescription } = createDescription(chara);
							const description = `${normalDescription}\n\n[color=#ff9999]LOCKED[/color]\n${unlockDesc}`;

							const worldMatrix = chara.getWorldTransformMatrix();
							const charaWorldX = worldMatrix.tx;
							const charaWorldY = worldMatrix.ty;

							const screenWidth = chara.scene.sys.game.config.width as number;
							const isRightSide = charaWorldX > screenWidth / 2;

							const TOOLTIP_OFFSET_X = 400;
							let tooltipX: number;

							if (isRightSide) {
								tooltipX = charaWorldX - TOOLTIP_OFFSET_X;
							} else {
								tooltipX = charaWorldX + chara.displayWidth + TOOLTIP_OFFSET_X;
							}
							const CHAR_TOP = charaWorldY - chara.displayHeight / 2;

							const EXTRA_OFFSET = -20;
							const tooltipY = CHAR_TOP + EXTRA_OFFSET;

							renderTooltip(tooltipX, tooltipY, title, description);
						});
						chara.on(Phaser.Input.Events.POINTER_OUT, () => {
							hideTooltip();
						});
					} else {
						Chara.enableTooltip(chara);
					}

					chara.setPosition(startX + col * cellWidth, startY + row * cellHeight);

					charaContainer.add(chara);
					charas.push(chara);
				}

				updateButtons();
			} finally {
				isLoading = false;
			}
		};

		const prevButton = createUIButton(
			"<",
			vec2(-100, PANEL_HEIGHT / 2 - 120),
			() => {
				if (isLoading) return;
				if (currentPage > 0) {
					currentPage--;
					renderPage(currentPage);
				}
			},
			60
		);

		const nextButton = createUIButton(
			">",
			vec2(100, PANEL_HEIGHT / 2 - 120),
			() => {
				if (isLoading) return;
				if (currentPage < getTotalPages() - 1) {
					currentPage++;
					renderPage(currentPage);
				}
			},
			60
		);

		const pageIndicator = io.Text("1 / 1", { fontSize: '24px', color: '#ffffff' });
		io.Centralize(pageIndicator);
		io.SetPosition(pageIndicator, vec2(0, PANEL_HEIGHT / 2 - 120));

		const closeButton = createUIButton(
			t("title.back"), // "BACK"
			vec2(0, PANEL_HEIGHT / 2 - 40),
			() => {
				modal.close();
			}
		);

		// Tabs
		const tabY = -PANEL_HEIGHT / 2 + 110;
		const unlockedTabBtn = createUIButton(
			t("collection.tabs.unlocked"),
			vec2(-150, tabY),
			() => switchTab("unlocked"),
			280
		);

		const lockedTabBtn = createUIButton(
			t("collection.tabs.locked"),
			vec2(150, tabY),
			() => switchTab("locked"),
			280
		);

		const switchTab = (tab: Tab) => {
			if (isLoading) return;
			if (currentTab === tab) return;
			currentTab = tab;
			currentPage = 0;
			displayCards = getCardsForTab(currentTab);
			renderPage(0);
			updateTabs();
		};

		const updateTabs = () => {
			if (currentTab === "unlocked") {
				unlockedTabBtn.disable(); // Visually "selected" or disabled from clicking again
				lockedTabBtn.enable();
			} else {
				unlockedTabBtn.enable();
				lockedTabBtn.disable();
			}
		};

		modal.container.add([
			prevButton.container,
			nextButton.container,
			pageIndicator,
			closeButton.container,
			unlockedTabBtn.container,
			lockedTabBtn.container
		]);


		const updateButtons = () => {
			const totalPages = getTotalPages();

			if (currentPage === 0) prevButton.disable();
			else prevButton.enable();

			if (currentPage >= totalPages - 1) nextButton.disable();
			else nextButton.enable();

			pageIndicator.setText(`${currentPage + 1} / ${totalPages}`);
		};

		// Initial render
		updateTabs();
		renderPage(currentPage);

		modal.onClose.then(() => {
			charas.forEach(c => Chara.destroy(c));
			resolve();
		});
	});
}
