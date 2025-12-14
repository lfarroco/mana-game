import { getAllCards } from "@Models/Entities/Card";
import { createUnitFromCardSpec } from "@Models/Entities/Unit";
import * as Chara from "@Systems/Chara/Chara";
import { createModal } from "@Components/Modal";
import { createUIButton } from "@Components/UIButton";
import { vec2 } from "@Models/Geometry";
import * as io from "@PhaserIO";
import { t } from "@i18n/i18n";
import * as StatsStore from "@Models/StatsStore";

const PANEL_WIDTH = 1200;
const PANEL_HEIGHT = 900;
const COLS = 5;
const ROWS = 2;
const CARDS_PER_PAGE = ROWS * COLS;

export function showCollectionModal(): Promise<void> {
	return new Promise((resolve) => {
		const modal = createModal({
			width: PANEL_WIDTH,
			height: PANEL_HEIGHT,
			title: t("title.collection_modal.title"), // "COLLECTION"
		});

		const cards = getAllCards().filter(c => !c.isCore && c.id !== "dummy" && c.id !== "dummy_card");
		const totalPages = Math.ceil(cards.length / CARDS_PER_PAGE);
		let currentPage = 0;
		const charas: Chara.Chara[] = [];

		const charaContainer = io.Container();
		modal.container.add(charaContainer);

		const renderPage = async (pageIndex: number) => {
			// Cleanup previous charas
			charas.forEach(c => Chara.destroy(c));
			charas.length = 0;
			charaContainer.removeAll(true);

			const startIdx = pageIndex * CARDS_PER_PAGE;
			const endIdx = Math.min(startIdx + CARDS_PER_PAGE, cards.length);
			const pageCards = cards.slice(startIdx, endIdx);

			const cellWidth = PANEL_WIDTH / COLS;
			// Use a more generous cell height or spacing
			const cellHeight = 300;
			const startX = -PANEL_WIDTH / 2 + cellWidth / 2;
			const startY = -PANEL_HEIGHT / 2 + 100 + cellHeight / 2;

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
				Chara.enableTooltip(chara);

				// Explicitly ensure interactivity for tooltip
				// Chara.create sets interactive, but let's be sure
				chara.setInteractive({ useHandCursor: true });

				// Check if locked
				const isUnlocked = !card.locked || StatsStore.isUnitUnlocked(card.id);
				if (!isUnlocked) {
					const sprite = Chara.mustGetState(chara).sprite;
					sprite.preFX?.addColorMatrix().grayscale(1);
				}

				chara.setPosition(startX + col * cellWidth, startY + row * cellHeight);

				charaContainer.add(chara);
				charas.push(chara);
			}

			updateButtons();
		};

		const prevButton = createUIButton(
			"<",
			vec2(-100, PANEL_HEIGHT / 2 - 120),
			() => {
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
				if (currentPage < totalPages - 1) {
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

		modal.container.add([
			prevButton.container,
			nextButton.container,
			pageIndicator,
			closeButton.container,
		]);


		const updateButtons = () => {
			if (currentPage === 0) prevButton.disable();
			else prevButton.enable();

			if (currentPage === totalPages - 1) nextButton.disable();
			else nextButton.enable();

			pageIndicator.setText(`${currentPage + 1} / ${totalPages}`);
		};

		// Initial render
		renderPage(currentPage);

		modal.onClose.then(() => {
			charas.forEach(c => Chara.destroy(c));
			resolve();
		});
	});
}
