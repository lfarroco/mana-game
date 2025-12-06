import * as c from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { getCurrentScene } from "@Models/State";
import * as io from "@PhaserIO";
import { createUIButton } from "@Components/UIButton";
import { t } from "@i18n/i18n";

// Tutorial slide configuration
const SLIDE_COUNT = 10;
const SLIDE_KEYS = Array.from({ length: SLIDE_COUNT }, (_, i) => `tutorial/slide_${i + 1}`);
const SLIDE_URLS = Array.from({ length: SLIDE_COUNT }, (_, i) => `assets/tutorial/slide_${i + 1}.png`);

// UI positioning
const OVERLAY_ALPHA = 0.85;
const BUTTON_Y = c.SCREEN_HEIGHT - 80;
const BUTTON_SPACING = 320;

let isOpen = false;

/**
 * Loads tutorial slide images on demand
 */
async function loadSlides(): Promise<void> {
	const scene = getCurrentScene();
	const loader = scene.load;

	// Check which slides need loading
	const slidesToLoad = SLIDE_KEYS.filter(key => !scene.textures.exists(key));

	if (slidesToLoad.length === 0) return;

	// Queue slides for loading
	slidesToLoad.forEach((key) => {
		const originalIndex = SLIDE_KEYS.indexOf(key);
		loader.image(key, SLIDE_URLS[originalIndex]);
	});

	// Wait for loading to complete
	return new Promise((resolve) => {
		loader.once("complete", resolve);
		loader.start();
	});
}

/**
 * Opens the tutorial overlay with slide navigation
 */
export async function openTutorial(): Promise<void> {
	if (isOpen) return;
	isOpen = true;

	const scene = getCurrentScene();

	// Load slides if not already loaded
	await loadSlides();

	let currentSlide = 0;

	// Create dark overlay background
	const overlay = scene.add.rectangle(
		c.MIDDLE_SCREEN_X,
		c.MIDDLE_SCREEN_Y,
		c.SCREEN_WIDTH,
		c.SCREEN_HEIGHT,
		0x000000,
		OVERLAY_ALPHA
	);
	overlay.setInteractive(); // Block clicks to elements behind

	// Create slide image display
	const slideImage = scene.add.image(
		c.MIDDLE_SCREEN_X,
		c.MIDDLE_SCREEN_Y - 40,
		SLIDE_KEYS[currentSlide]
	);

	// Scale slide to fit nicely on screen
	const maxWidth = c.SCREEN_WIDTH * 0.85;
	const maxHeight = c.SCREEN_HEIGHT * 0.75;
	const scaleX = maxWidth / slideImage.width;
	const scaleY = maxHeight / slideImage.height;
	const scale = Math.min(scaleX, scaleY, 1);
	slideImage.setScale(scale);

	// Update slide display
	const updateSlide = () => {
		slideImage.setTexture(SLIDE_KEYS[currentSlide]);

		// Recalculate scale for new image
		const newScaleX = maxWidth / slideImage.width;
		const newScaleY = maxHeight / slideImage.height;
		const newScale = Math.min(newScaleX, newScaleY, 1);
		slideImage.setScale(newScale);

		// Update button states
		if (currentSlide === 0) {
			prevButton.disable();
		} else {
			prevButton.enable();
		}

		if (currentSlide === SLIDE_COUNT - 1) {
			nextButton.disable();
		} else {
			nextButton.enable();
		}
	};

	// Create navigation buttons
	const prevButton = createUIButton(
		t("tutorial.previous"),
		vec2(c.MIDDLE_SCREEN_X - BUTTON_SPACING, BUTTON_Y),
		() => {
			if (currentSlide > 0) {
				currentSlide--;
				updateSlide();
			}
		}
	);

	const nextButton = createUIButton(
		t("tutorial.next"),
		vec2(c.MIDDLE_SCREEN_X, BUTTON_Y),
		() => {
			if (currentSlide < SLIDE_COUNT - 1) {
				currentSlide++;
				updateSlide();
			}
		}
	);

	const exitButton = createUIButton(
		t("tutorial.exit"),
		vec2(c.MIDDLE_SCREEN_X + BUTTON_SPACING, BUTTON_Y),
		() => {
			container.destroy(true);
			isOpen = false;
		}
	);

	// Create container for all elements
	const container = io.Container([
		overlay,
		slideImage,
		prevButton.container,
		nextButton.container,
		exitButton.container,
	]);

	io.BringToTop(container);

	// Initialize button states
	updateSlide();
}
