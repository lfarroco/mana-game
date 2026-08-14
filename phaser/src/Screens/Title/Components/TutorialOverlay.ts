import * as Constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as i18n from "@i18n/i18n";
import { env } from "@Env";
import { makeContainer } from "@Env";
import { slides } from "./tutorialSlides";

const OVERLAY_ALPHA = 0.85;
const BUTTON_Y = Constants.SCREEN_HEIGHT - 80;

let isOpen = false;

export async function openTutorial(): Promise<void> {
	if (isOpen) return;
	isOpen = true;

	let currentSlide = 0;

	const overlay = env.scene.add.rectangle(
		Constants.MIDDLE_SCREEN_X,
		Constants.MIDDLE_SCREEN_Y,
		Constants.SCREEN_WIDTH,
		Constants.SCREEN_HEIGHT,
		0x000000,
		OVERLAY_ALPHA
	);
	overlay.setInteractive();

	let slide = slides[currentSlide]();

	const updateSlide = () => {
		container.remove(slide, true);

		slide = slides[currentSlide]();

		container.add(slide);

		if (currentSlide === 0) {
			prevButton.disable();
		} else {
			prevButton.enable();
		}

		if (currentSlide === slides.length - 1) {
			nextButton.disable();
		} else {
			nextButton.enable();
		}
	};

	const prevButton = UIButton.create({
		text: i18n.t("tutorial.previous"),
		position: [200, Constants.MIDDLE_SCREEN_Y],
		callback: () => {
			if (currentSlide > 0) {
				currentSlide--;
				updateSlide();
			}
		},
	});

	const nextButton = UIButton.create({
		text: i18n.t("tutorial.next"),
		position: [Constants.SCREEN_WIDTH - 200, Constants.MIDDLE_SCREEN_Y],
		callback: () => {
			if (currentSlide < slides.length - 1) {
				currentSlide++;
				updateSlide();
			}
		},
	});

	const exitButton = UIButton.create({
		text: i18n.t("tutorial.exit"),
		position: [Constants.MIDDLE_SCREEN_X, BUTTON_Y],
		callback: () => {
			container.destroy(true);
			isOpen = false;
		},
	});

	const container = makeContainer([
		overlay,
		slide,
		prevButton.container,
		nextButton.container,
		exitButton.container,
	]);

	updateSlide();
}
