/**
 * TutorialOverlay — the interactive tutorial runtime.
 *
 * The old overlay was a slideshow: 14 slides of text, Previous/Next/Exit, and
 * looping FX. This version keeps the slide structure but locks **Next** until
 * the player has actually performed the slide's interaction (see
 * `Tutorial/slideProgress.ts` and `docs/interactive-tutorial.md`).
 *
 * State is per-open (closures), so a re-open always starts clean; the only
 * module-level flag is the "an overlay is open" guard, which `reset()` clears
 * on title-screen shutdown.
 */

import * as Constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as i18n from "@i18n/i18n";
import { env, makeContainer } from "@Env";
import { TUTORIAL_SLIDES, slideGate } from "@game/content/tutorialSlides";
import { buildTutorialSlide, type BuiltTutorialSlide } from "./Tutorial/buildTutorialSlide";
import {
	emptyProgress,
	gateCompletion,
	isGateSatisfied,
	recordProgress,
	type ProgressEvent,
	type SlideProgress,
} from "./Tutorial/slideProgress";

const OVERLAY_ALPHA = 0.85;
const BUTTON_Y = Constants.SCREEN_HEIGHT - 80;
const PROGRESS_BAR_WIDTH = 420;
const PROGRESS_BAR_HEIGHT = 8;

let isOpen = false;

/** Clear the open guard on scene shutdown (the overlay's objects die with the scene). */
export function reset(): void {
	isOpen = false;
}

/**
 * Dev-only handle for the e2e suite (`window.__debugTutorial`). The Playwright
 * suite cannot reach into scene internals, so the overlay publishes what the
 * test needs to drive it: the current lesson, whether its gate is satisfied,
 * and navigation that goes through the real gate checks.
 */
export interface TutorialDebugProbe {
	slide: () => number;
	total: () => number;
	gateSatisfied: () => boolean;
	completion: () => number;
	next: () => void;
	previous: () => void;
	close: () => void;
	isOpen: () => boolean;
}

export interface TutorialOptions {
	/** Slide to open on (used to resume where the player stopped last time). */
	startSlide?: number;
	/** Called when the player exits — `furthestSlide` is 0-based. */
	onClose?: (furthestSlide: number) => void;
}

export async function openTutorial(options: TutorialOptions = {}): Promise<void> {
	if (isOpen) return;
	isOpen = true;

	let currentSlide = Math.max(0, Math.min(TUTORIAL_SLIDES.length - 1, options.startSlide ?? 0));
	let furthestSlide = currentSlide;

	const overlay = env.scene.add.rectangle(
		Constants.MIDDLE_SCREEN_X,
		Constants.MIDDLE_SCREEN_Y,
		Constants.SCREEN_WIDTH,
		Constants.SCREEN_HEIGHT,
		0x000000,
		OVERLAY_ALPHA
	);
	overlay.setInteractive();

	// --- chrome (declared before the slide builder, which calls back into it) --
	const progressTrack = env.scene.add.graphics();
	const progressFill = env.scene.add.graphics();
	const progressLabel = env.scene.add
		.text(Constants.MIDDLE_SCREEN_X, BUTTON_Y - 34, "", {
			...Constants.defaultTextConfig,
			fontSize: 24,
			color: "#cccccc",
		})
		.setOrigin(0.5);
	const hintText = env.scene.add
		.text(Constants.MIDDLE_SCREEN_X, BUTTON_Y + 46, "", {
			...Constants.defaultTextConfig,
			fontSize: 24,
			color: "#ffe066",
		})
		.setOrigin(0.5);

	const prevButton = UIButton.create({
		text: i18n.t("tutorial.previous"),
		position: [200, Constants.MIDDLE_SCREEN_Y],
		callback: () => {
			if (currentSlide > 0) showSlide(currentSlide - 1);
		},
	});

	const nextButton = UIButton.create({
		text: i18n.t("tutorial.next"),
		position: [Constants.SCREEN_WIDTH - 200, Constants.MIDDLE_SCREEN_Y],
		callback: () => {
			if (isGateSatisfied(slideGate(TUTORIAL_SLIDES[currentSlide]), progress)) advance();
		},
	});

	const exitButton = UIButton.create({
		text: i18n.t("tutorial.exit"),
		position: [Constants.MIDDLE_SCREEN_X, BUTTON_Y],
		callback: () => close(),
	});

	const container = makeContainer([
		overlay,
		progressTrack,
		progressFill,
		progressLabel,
		hintText,
		prevButton.container,
		nextButton.container,
		exitButton.container,
	]);

	// --- per-slide state ------------------------------------------------------
	let progress: SlideProgress = emptyProgress();
	// Placeholder until `showSlide()` builds the first real slide at the end of
	// this function — building eagerly here would capture `report` before it is
	// initialized (the report callback is the one piece of state a slide needs).
	let built: BuiltTutorialSlide = {
		container: env.container(),
		dispose: () => {},
	};

	const report = (event: ProgressEvent) => {
		const next = recordProgress(progress, event);
		if (next === progress) return;
		progress = next;
		drawProgress();
		syncGate();
	};

	/** Lock/unlock Next for the current slide and explain what is missing. */
	function syncGate() {
		const gate = slideGate(TUTORIAL_SLIDES[currentSlide]);
		const satisfied = isGateSatisfied(gate, progress);
		const isLast = currentSlide === TUTORIAL_SLIDES.length - 1;

		if (satisfied) {
			nextButton.enable();
			nextButton.text.setColor("#ffffff");
			nextButton.text.setText(isLast ? i18n.t("tutorial.finish") : i18n.t("tutorial.next"));
			hintText.setText(isLast ? "" : i18n.t("tutorial.unlocked"));
		} else {
			nextButton.disable();
			nextButton.text.setColor("#9a9a9a");
			nextButton.text.setText(i18n.t("tutorial.locked"));
			hintText.setText(i18n.t("tutorial.finishToContinue"));
		}
	}

	const drawProgress = () => {
		const x = Constants.MIDDLE_SCREEN_X - PROGRESS_BAR_WIDTH / 2;
		const y = BUTTON_Y - 12;

		progressTrack.clear();
		progressTrack.fillStyle(0xffffff, 0.18);
		progressTrack.fillRoundedRect(x, y, PROGRESS_BAR_WIDTH, PROGRESS_BAR_HEIGHT, 4);

		progressFill.clear();
		progressFill.fillStyle(0xffe066, 0.9);
		const ratio = gateCompletion(slideGate(TUTORIAL_SLIDES[currentSlide]), progress);
		if (ratio > 0) {
			progressFill.fillRoundedRect(
				x,
				y,
				Math.max(4, PROGRESS_BAR_WIDTH * ratio),
				PROGRESS_BAR_HEIGHT,
				4
			);
		}

		progressLabel.setText(
			`${i18n.t("tutorial.slideCounter")} ${currentSlide + 1}/${TUTORIAL_SLIDES.length}`
		);
	};

	const showSlide = (index: number) => {
		currentSlide = index;
		furthestSlide = Math.max(furthestSlide, index);

		built.dispose();
		progress = emptyProgress();
		built = buildTutorialSlide(TUTORIAL_SLIDES[currentSlide], report);
		container.add(built.container);

		if (currentSlide === 0) prevButton.disable();
		else prevButton.enable();

		syncGate();
		drawProgress();
	};

	const advance = () => {
		if (currentSlide < TUTORIAL_SLIDES.length - 1) {
			showSlide(currentSlide + 1);
		} else {
			close();
		}
	};

	const close = () => {
		if (!isOpen) return;
		// Report the furthest slide so the caller can offer to resume next launch.
		const reached = furthestSlide;
		keyboard?.off("keydown", onKeyDown);
		container.destroy(true);
		isOpen = false;
		clearDebugProbe();
		options.onClose?.(reached);
	};

	// Keyboard: Left/Right page, Escape exits (the old overlay was pointer-only).
	const keyboard = env.scene.input.keyboard;
	const onKeyDown = (event: KeyboardEvent) => {
		if (event.key === "ArrowLeft" && currentSlide > 0) {
			showSlide(currentSlide - 1);
		} else if (event.key === "ArrowRight") {
			if (isGateSatisfied(slideGate(TUTORIAL_SLIDES[currentSlide]), progress)) advance();
		} else if (event.key === "Escape") {
			close();
		}
	};
	keyboard?.on("keydown", onKeyDown);

	// Publish the dev probe before the first slide builds, so a test can drive
	// the overlay while its async panels (summoning units) are still resolving.
	installDebugProbe({
		slide: () => currentSlide,
		total: () => TUTORIAL_SLIDES.length,
		gateSatisfied: () => isGateSatisfied(slideGate(TUTORIAL_SLIDES[currentSlide]), progress),
		completion: () => gateCompletion(slideGate(TUTORIAL_SLIDES[currentSlide]), progress),
		next: () => {
			if (isGateSatisfied(slideGate(TUTORIAL_SLIDES[currentSlide]), progress)) advance();
		},
		previous: () => {
			if (currentSlide > 0) showSlide(currentSlide - 1);
		},
		close,
		isOpen: () => isOpen,
	});

	showSlide(currentSlide);
}

/**
 * Attach the probe to `window.__debugTutorial`. Gated on the same `__DEV__`
 * flag `installDebugCommands` uses, so production builds ship nothing.
 */
function installDebugProbe(probe: TutorialDebugProbe): void {
	if (!__DEV__ || typeof window === "undefined") return;
	(window as Window & { __debugTutorial?: TutorialDebugProbe | null }).__debugTutorial = probe;
}

/** Clear the dev probe (drops the stale closure when the overlay closes). */
function clearDebugProbe(): void {
	if (!__DEV__ || typeof window === "undefined") return;
	(window as Window & { __debugTutorial?: TutorialDebugProbe | null }).__debugTutorial = null;
}
