import * as Card from "@Models/Entities/Card";
import * as Unit from "@Models/Entities/Unit";
import * as Chara from "@Systems/Chara/Chara";
import * as Modal from "@Components/Modal/Modal";
import * as UIButton from "@Components/Button/UIButton";
import * as Geometry from "@Models/Geometry";
import * as i18n from "@i18n/i18n";
import * as StatsStore from "@Models/StatsStore";
import * as Tooltip from "@Components/Tooltip/Tooltip";
import * as createDescription from "@Systems/Chara/createDescription";

const PANEL_WIDTH = 1200;
const PANEL_HEIGHT = 900;
const COLS = 5;
const ROWS = 2;
const CARDS_PER_PAGE = ROWS * COLS;

type Tab = "unlocked" | "locked";

export const create = () => new Promise<void>((resolve) => {

	const modal = Modal.createModal({
		width: PANEL_WIDTH,
		height: PANEL_HEIGHT,
		title: i18n.t("title.collection_modal.title"), // "COLLECTION"
	});

	const allCards = Card.getAllCards().filter(
		(c) => !c.isCore && c.id !== "dummy" && c.id !== "dummy_card"
	);

	let currentTab: Tab = "unlocked";
	let currentPage = 0;
	const charas: Chara.Chara[] = [];
	let displayCards = getCardsForTab(currentTab);
	let isLoading = false;

	const charaContainer = io.Container();
	modal.container.add(charaContainer);

	function getCardsForTab(tab: Tab) {
		return allCards.filter((c) => {
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
			charas.forEach((c) => Chara.destroy(c));
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
				const dummyUnit = Unit.createUnitFromCardSpec(dummyId, card, undefined, "NEUTRAL");

				// Create chara
				const chara = await Chara.create(dummyUnit);
				// Check if locked
				const isUnlocked = !card.locked || StatsStore.isUnitUnlocked(card.id);
				if (!isUnlocked) {
					const sprite = Chara.mustGetState(chara).sprite;
					sprite.preFX?.addColorMatrix().grayscale(1);

					const unlockDescKey = `unlock_description.${card.id}`;
					const unlockDesc = i18n.t(unlockDescKey);

					chara.on(Phaser.Input.Events.POINTER_OVER, () => {
						const { title, description: normalDescription } = createDescription.createDescription(chara);
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

						Tooltip.renderTooltip(tooltipX, tooltipY, title, description);
					});
					chara.on(Phaser.Input.Events.POINTER_OUT, () => {
						Tooltip.hideTooltip();
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

	const prevButton = UIButton.create({
		text: "<",
		position: Geometry.vec2(-100, PANEL_HEIGHT / 2 - 120),
		callback: () => {
			if (isLoading) return;
			if (currentPage > 0) {
				currentPage--;
				renderPage(currentPage);
			}
		},
		width: 60,
	});

	const nextButton = UIButton.create({
		text: ">",
		position: Geometry.vec2(100, PANEL_HEIGHT / 2 - 120),
		callback: () => {
			if (isLoading) return;
			if (currentPage < getTotalPages() - 1) {
				currentPage++;
				renderPage(currentPage);
			}
		},
		width: 60,
	});

	const pageIndicator = io.Text("1 / 1", { fontSize: "24px", color: "#ffffff" });
	io.Centralize(pageIndicator);
	io.SetPosition(pageIndicator, Geometry.vec2(0, PANEL_HEIGHT / 2 - 120));

	const closeButton = UIButton.create({
		text: i18n.t("title.back"),
		position: Geometry.vec2(0, PANEL_HEIGHT / 2 - 40),
		callback: () => {
			modal.close();
		},
	});

	// Tabs
	const tabY = -PANEL_HEIGHT / 2 + 110;
	const unlockedTabBtn = UIButton.create({
		text: i18n.t("collection.tabs.unlocked"),
		position: Geometry.vec2(-150, tabY),
		callback: () => switchTab("unlocked"),
		width: 280,
	});

	const lockedTabBtn = UIButton.create({
		text: i18n.t("collection.tabs.locked"),
		position: Geometry.vec2(150, tabY),
		callback: () => switchTab("locked"),
		width: 280,
	});

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
		lockedTabBtn.container,
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
		charas.forEach((c) => Chara.destroy(c));
		resolve();
	});
});
