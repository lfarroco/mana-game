/**
 * Tutorial entry points (title screen).
 *
 * Two ways in:
 *   - the permanent menu button (`createTutorialButton`);
 *   - a one-time offer on first-ever launch (`maybeOfferTutorial`), backed by
 *     `Models/tutorialStore` so it is shown exactly once and resumes where the
 *     player stopped.
 *
 * The offer is a modal-style prompt, not a forced detour: "Play the tutorial"
 * or "Maybe later".
 */

import * as Constants from "@Constants";
import * as Modal from "@Components/Modal/Modal";
import * as UIButton from "@Components/Button/UIButton";
import * as i18n from "@i18n/i18n";
import { env } from "@Env";
import { getTutorialProgress, markTutorialSeen } from "@Models/tutorialStore";
import { TUTORIAL_SLIDES } from "@game/content/tutorialSlides";
import { whenUnlockModalsClosed } from "./UnlockModal";
import * as TutorialOverlay from "./TutorialOverlay";

/** Permanent menu entry. */
export function createTutorialButton(y: number): Phaser.GameObjects.Container {
	const title = i18n.t("title.tutorial");
	return UIButton.create({
		text: title,
		position: [Constants.MIDDLE_SCREEN_X, y],
		callback: () => openTutorial(),
		tooltip: {
			title,
			description: i18n.t("title.tooltip.tutorial"),
			position: "right",
		},
	}).container;
}

/** Open the tutorial, remembering where the player stopped. */
export function openTutorial(): void {
	void TutorialOverlay.openTutorial({
		startSlide: getTutorialProgress().furthestSlide,
		onClose: (furthestSlide) => {
			markTutorialSeen(furthestSlide);
		},
	});
}

/**
 * Offer the tutorial once, on the first launch that never saw it. Fire-and-
 * forget from `buildScreen()`: the menu is usable behind the prompt.
 */
export async function maybeOfferTutorial(): Promise<void> {
	const progress = getTutorialProgress();
	if (progress.seen) return;
	// An unlock modal is a modal prompt too — never stack the two.
	await whenUnlockModalsClosed();

	const total = TUTORIAL_SLIDES.length;
	const resuming = progress.furthestSlide > 0 && progress.furthestSlide < total - 1;

	const bodyKey = resuming ? "tutorial.offer.resume" : "tutorial.offer.body";
	const acceptKey = resuming ? "tutorial.offer.resumeAction" : "tutorial.offer.play";

	await new Promise<void>((resolve) => {
		const modal = Modal.createModal({
			width: 760,
			height: 420,
			title: i18n.t("tutorial.offer.title"),
		});

		const body = env.scene.add
			.text(0, -70, i18n.t(bodyKey), {
				...Constants.defaultTextConfig,
				fontSize: 26,
				color: "#ffffff",
				align: "center",
				wordWrap: { width: 660 },
			})
			.setOrigin(0.5);

		const playButton = UIButton.create({
			text: i18n.t(acceptKey),
			position: [0, 60],
			width: 360,
			callback: () => {
				markTutorialSeen(progress.furthestSlide);
				modal.container.destroy(true);
				openTutorial();
				resolve();
			},
		});

		const laterButton = UIButton.create({
			text: i18n.t("tutorial.offer.later"),
			position: [0, 140],
			width: 360,
			callback: () => {
				// "Maybe later" must not suppress the offer forever — only an actual
				// visit (or an explicit dismissal) marks it seen.
				modal.container.destroy(true);
				resolve();
			},
		});

		modal.container.add([body, playButton.container, laterButton.container]);
	});
}
